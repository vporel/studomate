import { absolute } from "@/app/metadata";
import type { Locale } from "@/i18n/config";
import { serializeJsonLd } from "@/app/[locale]/json-ld";
import type { GlossaryEntryView } from "./glossary-view";

/** JSON-LD `DefinedTermSet` of the glossary: one `DefinedTerm` per entry, anchored on its id. */
export default function buildGlossaryJsonLd(
	locale: Locale,
	name: string,
	description: string,
	entries: GlossaryEntryView[],
): string {
	const pageUrl = absolute(locale, "/training/glossary");
	return serializeJsonLd({
		"@context": "https://schema.org",
		"@type": "DefinedTermSet",
		name,
		description,
		inLanguage: locale,
		url: pageUrl,
		hasDefinedTerm: entries.map((entry) => ({
			"@type": "DefinedTerm",
			name: entry.term,
			alternateName: entry.aliases.length ? entry.aliases : undefined,
			description: entry.definition,
			url: `${pageUrl}#${entry.id}`,
			inDefinedTermSet: pageUrl,
		})),
	});
}
