import { serializeJsonLd } from "@/app/[locale]/json-ld";
import type { Locale } from "@/i18n/config";

export type FaqItem = { question: string; answer: string };

/** JSON-LD `FAQPage`: one `Question` per item, its text identical to the visible FAQ. */
export default function buildFaqJsonLd(
	locale: Locale,
	items: FaqItem[],
): string {
	return serializeJsonLd({
		"@context": "https://schema.org",
		"@type": "FAQPage",
		inLanguage: locale,
		mainEntity: items.map(({ question, answer }) => ({
			"@type": "Question",
			name: question,
			acceptedAnswer: { "@type": "Answer", text: answer },
		})),
	});
}
