import type { ContactTopic } from "@/contact/contact-message";
import type { Locale } from "@/i18n/config";
import { getPathname } from "@/i18n/navigation";
import trackEvent from "@/ui/services/analytics";

/** Path of the contact page in `locale`, with `topic` preselected. */
export function contactPageUrl(locale: Locale, topic?: ContactTopic): string {
	return getPathname({
		locale,
		href: topic
			? { pathname: "/contact", query: { topic } }
			: { pathname: "/contact" },
	});
}

/** Opens the contact page in a new tab, keeping the app open. */
export function openContactPage(locale: Locale, topic?: ContactTopic): void {
	window.open(contactPageUrl(locale, topic), "_blank", "noopener");
}

/** Opens the contact page on the "problem" topic and records the intent to give feedback. */
export function openReportIssue(locale: Locale): void {
	trackEvent("feedback-opened");
	openContactPage(locale, "problem");
}
