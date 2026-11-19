import { APP_NAME } from "@/app-info";
import type {
	ContactSubmission,
	ContactTopic,
} from "@/contact/contact-message";
import sendEmailToTeam from "../send-email";

const TOPIC_LABELS: Record<ContactTopic, string> = {
	question: "Question d'utilisation",
	"forgotten-password": "Accès au compte",
	problem: "Problème",
	teaching: "Enseignant / établissement",
	contribution: "Idée / contribution",
	other: "Autre",
};

/** True when Resend accepted the message. Replying to the email answers the visitor. */
export default function sendContactEmail(
	submission: ContactSubmission,
): Promise<boolean> {
	const text = [
		`Sujet : ${TOPIC_LABELS[submission.topic]}`,
		`Nom : ${submission.name ?? "(non renseigné)"}`,
		`Email : ${submission.email}`,
		`Langue : ${submission.locale ?? "inconnue"}`,
		...(submission.userAgent ? [`Navigateur : ${submission.userAgent}`] : []),
		"",
		submission.message,
	].join("\n");

	return sendEmailToTeam({
		subject: `[${APP_NAME}] Contact : ${TOPIC_LABELS[submission.topic]}`,
		text,
		replyTo: submission.email,
	});
}
