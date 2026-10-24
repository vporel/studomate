import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

export type TemplateText = (
	key: string,
	values?: Record<string, string | number>,
) => string;

/**
 * Translator for the texts a template puts inside the project it builds (names, titles,
 * comments, labels). Reads `templateContent.<templateId>.texts` and replaces `{name}`
 * placeholders. A missing key throws: it is a template bug, caught by the template tests.
 */
export default function createTemplateText(
	templateId: string,
	locale: Locale,
): TemplateText {
	const texts = getMessages(locale).templateContent[templateId]?.texts;
	return (key, values) => {
		const text = texts?.[key];
		if (text === undefined) {
			throw new Error(
				`Missing template text "${templateId}.${key}" (${locale})`,
			);
		}
		return text.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
			name in (values ?? {}) ? String(values![name]) : placeholder,
		);
	};
}

/** Exercise statement of a template in the given locale, in Markdown. */
export function getTemplateStatement(
	templateId: string,
	locale: Locale,
): string | undefined {
	return getMessages(locale).templateContent[templateId]?.statement;
}
