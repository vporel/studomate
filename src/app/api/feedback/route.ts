import { parseFeedbackSubmission } from "@/feedback/feedback-submission";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import allowFeedbackRequest from "./rate-limit";
import sendFeedbackEmail, {
	isFeedbackEmailConfigured,
} from "./send-feedback-email";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function json(body: Record<string, unknown>, status: number): Response {
	return Response.json(body, { status });
}

function clientAddress(request: Request): string {
	return (
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		request.headers.get("x-real-ip") ||
		"unknown"
	);
}

/**
 * The client writes with the visitor's own session when there is a valid one, so that the
 * row-level policy checks `user_id` against the token rather than trusting the payload.
 */
async function resolveSupabase(
	request: Request,
): Promise<{ supabase: SupabaseClient; userId: string | null } | null> {
	if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
	const options = { auth: { persistSession: false } };
	const anonymous = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, options);

	const token = request.headers
		.get("authorization")
		?.replace(/^Bearer\s+/i, "");
	if (!token) return { supabase: anonymous, userId: null };

	const { data } = await anonymous.auth.getUser(token);
	if (!data.user) return { supabase: anonymous, userId: null };
	return {
		supabase: createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
			...options,
			global: { headers: { Authorization: `Bearer ${token}` } },
		}),
		userId: data.user.id,
	};
}

export async function POST(request: Request): Promise<Response> {
	if (!allowFeedbackRequest(clientAddress(request))) {
		return json({ error: "rate-limited" }, 429);
	}

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return json({ error: "invalid" }, 400);
	}
	const submission = parseFeedbackSubmission(payload);
	if (!submission) return json({ error: "invalid" }, 400);

	const connection = await resolveSupabase(request);
	if (!connection && !isFeedbackEmailConfigured()) {
		return json({ error: "not-configured" }, 503);
	}

	const userId = connection?.userId ?? null;
	const [stored, mailed] = await Promise.all([
		connection
			? connection.supabase
					.from("feedback")
					.insert({
						user_id: userId,
						rating: submission.rating,
						comment: submission.comment,
						locale: submission.locale,
					})
					.then(({ error }) => !error)
			: false,
		sendFeedbackEmail(submission, userId),
	]);

	// An opinion kept by either channel is not lost.
	return stored || mailed
		? json({ ok: true }, 200)
		: json({ error: "failed" }, 502);
}
