import { APP_CONTACT_EMAIL, APP_NAME } from "@/app-info";
import type { FeedbackSubmission } from "@/feedback/feedback-submission";
import { FEEDBACK_RATING_MAX } from "@/feedback/feedback-prompt";

const RESEND_URL = "https://api.resend.com/emails";

export function isFeedbackEmailConfigured(): boolean {
	return Boolean(process.env.RESEND_API_KEY && process.env.FEEDBACK_EMAIL_FROM);
}

/** True when Resend accepted the message. */
export default async function sendFeedbackEmail(
	submission: FeedbackSubmission,
	userId: string | null,
): Promise<boolean> {
	if (!isFeedbackEmailConfigured()) return false;

	const text = [
		`Note : ${submission.rating}/${FEEDBACK_RATING_MAX}`,
		`Langue : ${submission.locale ?? "inconnue"}`,
		`Utilisateur : ${userId ?? "non connecté"}`,
		"",
		submission.comment ?? "(aucun commentaire)",
	].join("\n");

	try {
		const response = await fetch(RESEND_URL, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				from: process.env.FEEDBACK_EMAIL_FROM,
				to: process.env.FEEDBACK_EMAIL_TO || APP_CONTACT_EMAIL,
				subject: `[${APP_NAME}] Nouvel avis : ${submission.rating}/${FEEDBACK_RATING_MAX}`,
				text,
			}),
		});
		return response.ok;
	} catch {
		return false;
	}
}
