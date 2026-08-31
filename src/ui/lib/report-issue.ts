import { APP_CONTACT_EMAIL, APP_NAME } from "@/app-info";

const SUBJECT = `[${APP_NAME}] Signalement de problème`;

/**
 * Construit le lien `mailto:` de signalement de problème, avec un corps pré-rempli.
 * L'URL courante et le user-agent sont ajoutés quand la fonction est appelée côté client.
 */
export default function buildReportIssueMailto(): string {
	const lines = [
		"Décrivez le problème rencontré :",
		"",
		"",
		"Étapes pour le reproduire :",
		"",
		"",
		"---",
	];

	if (typeof window !== "undefined") {
		lines.push(`Page : ${window.location.href}`);
		lines.push(`Navigateur : ${window.navigator.userAgent}`);
	}

	const query = `subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(
		lines.join("\n"),
	)}`;
	return `mailto:${APP_CONTACT_EMAIL}?${query}`;
}
