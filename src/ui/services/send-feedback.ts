import type { FeedbackSubmission } from "@/feedback/feedback-submission";
import {
	isSupabaseConfigured,
	supabase,
} from "@/persistence/repositories/supabase-client";

async function getAccessToken(): Promise<string | null> {
	if (!isSupabaseConfigured) return null;
	try {
		const { data } = await supabase.auth.getSession();
		return data.session?.access_token ?? null;
	} catch {
		return null;
	}
}

/** True when the opinion reached the server. */
export default async function sendFeedback(
	submission: FeedbackSubmission,
): Promise<boolean> {
	const token = await getAccessToken();
	try {
		const response = await fetch("/api/feedback", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(token && { Authorization: `Bearer ${token}` }),
			},
			body: JSON.stringify(submission),
		});
		return response.ok;
	} catch {
		return false;
	}
}
