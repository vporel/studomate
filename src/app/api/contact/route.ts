import { parseContactSubmission } from "@/contact/contact-message";
import createRateLimiter, { clientAddress } from "../rate-limit";
import readJsonBody from "../read-json-body";
import { isEmailConfigured } from "../send-email";
import sendContactEmail from "./send-contact-email";

export const dynamic = "force-dynamic";

// A whole class may write from the same school address, e.g. students who forgot their password.
const rateLimiter = createRateLimiter({ maxRequests: 20 });

function json(body: Record<string, unknown>, status: number): Response {
	return Response.json(body, { status });
}

export async function POST(request: Request): Promise<Response> {
	const body = await readJsonBody(request);
	if (!body.ok) {
		return body.reason === "too-large"
			? json({ error: "too-large" }, 413)
			: json({ error: "invalid" }, 400);
	}
	const payload = body.value;

	// The hidden `website` field is only filled by bots: they are answered as if it had worked.
	const website = (payload as { website?: unknown } | null)?.website;
	if (typeof website === "string" && website !== "") {
		return json({ ok: true }, 200);
	}

	const submission = parseContactSubmission(payload);
	if (!submission) return json({ error: "invalid" }, 400);
	if (!rateLimiter.allow(clientAddress(request))) {
		return json({ error: "rate-limited" }, 429);
	}
	if (!isEmailConfigured()) return json({ error: "not-configured" }, 503);

	return (await sendContactEmail(submission))
		? json({ ok: true }, 200)
		: json({ error: "failed" }, 502);
}
