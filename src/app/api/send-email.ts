import { APP_CONTACT_EMAIL, APP_FEEDBACK_EMAIL_FROM } from "@/app-info";

const RESEND_URL = "https://api.resend.com/emails";

export function isEmailConfigured(): boolean {
	return Boolean(process.env.RESEND_API_KEY);
}

/** Sends a plain-text email to the Studomate team. True when Resend accepted it. */
export default async function sendEmailToTeam(email: {
	subject: string;
	text: string;
	replyTo?: string;
}): Promise<boolean> {
	if (!isEmailConfigured()) return false;
	try {
		const response = await fetch(RESEND_URL, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				from: APP_FEEDBACK_EMAIL_FROM,
				to: APP_CONTACT_EMAIL,
				subject: email.subject,
				text: email.text,
				...(email.replyTo ? { reply_to: email.replyTo } : {}),
			}),
		});
		return response.ok;
	} catch {
		return false;
	}
}
