import { APP_NAME } from "@/app-info";
import type { FeedbackSubmission } from "@/feedback/feedback-submission";
import { FEEDBACK_RATING_MAX } from "@/feedback/feedback-prompt";
import sendEmailToTeam from "../send-email";

/** True when Resend accepted the message. */
export default async function sendFeedbackEmail(
	submission: FeedbackSubmission,
	userId: string | null,
): Promise<boolean> {
	const text = [
		`Note : ${submission.rating}/${FEEDBACK_RATING_MAX}`,
		`Langue : ${submission.locale ?? "inconnue"}`,
		`Utilisateur : ${userId ?? "non connecté"}`,
		"",
		submission.comment ?? "(aucun commentaire)",
	].join("\n");

	return sendEmailToTeam({
		subject: `[${APP_NAME}] Nouvel avis : ${submission.rating}/${FEEDBACK_RATING_MAX}`,
		text,
	});
}
