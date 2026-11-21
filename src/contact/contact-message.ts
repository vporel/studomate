import { isRecord } from "@/lib/object";
import { isLocale, type Locale } from "@/i18n/config";

/** Topics a visitor can write about, also accepted as `?topic=` by the contact page. */
export const CONTACT_TOPICS = [
	"question",
	"forgotten-password",
	"problem",
	"teaching",
	"contribution",
	"other",
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

/** Topics whose message starts from a template the visitor completes. */
export const CONTACT_TOPICS_WITH_TEMPLATE = [
	"forgotten-password",
	"problem",
] as const satisfies readonly ContactTopic[];

export type ContactTopicWithTemplate =
	(typeof CONTACT_TOPICS_WITH_TEMPLATE)[number];

export function hasContactTemplate(
	topic: ContactTopic,
): topic is ContactTopicWithTemplate {
	return (CONTACT_TOPICS_WITH_TEMPLATE as readonly string[]).includes(topic);
}

export const CONTACT_MESSAGE_MIN_LENGTH = 10;
export const CONTACT_MESSAGE_MAX_LENGTH = 5000;
export const CONTACT_NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 254;
const USER_AGENT_MAX_LENGTH = 500;

export function isContactTopic(value: unknown): value is ContactTopic {
	return (
		typeof value === "string" &&
		(CONTACT_TOPICS as readonly string[]).includes(value)
	);
}

export function isValidContactEmail(value: string): boolean {
	return (
		value.length <= EMAIL_MAX_LENGTH && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
	);
}

/** A message as it travels from the contact page to the `/api/contact` route. */
export type ContactSubmission = {
	topic: ContactTopic;
	email: string;
	name: string | null;
	message: string;
	locale: Locale | null;
	/** Sent with a problem report only. */
	userAgent: string | null;
};

/** `null` when the payload is not a valid message. A blank name is no name. */
export function parseContactSubmission(raw: unknown): ContactSubmission | null {
	if (!isRecord(raw)) return null;
	const { topic, email, name, message, locale, userAgent } = raw;

	if (!isContactTopic(topic)) return null;
	if (typeof email !== "string" || !isValidContactEmail(email.trim()))
		return null;
	if (typeof message !== "string") return null;
	const trimmedMessage = message.trim();
	if (
		trimmedMessage.length < CONTACT_MESSAGE_MIN_LENGTH ||
		trimmedMessage.length > CONTACT_MESSAGE_MAX_LENGTH
	)
		return null;
	if (name !== undefined && name !== null && typeof name !== "string")
		return null;
	const trimmedName = typeof name === "string" ? name.trim() : "";
	if (trimmedName.length > CONTACT_NAME_MAX_LENGTH) return null;

	return {
		topic,
		email: email.trim(),
		name: trimmedName === "" ? null : trimmedName,
		message: trimmedMessage,
		locale: isLocale(locale) ? locale : null,
		userAgent:
			topic === "problem" && typeof userAgent === "string"
				? userAgent.slice(0, USER_AGENT_MAX_LENGTH)
				: null,
	};
}
