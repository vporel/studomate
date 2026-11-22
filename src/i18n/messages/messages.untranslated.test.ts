import { getMessages } from "@/i18n/messages";

function flatEntries(obj: unknown, prefix = ""): [string, string][] {
	if (typeof obj === "string") return [[prefix, obj]];
	if (obj === null || typeof obj !== "object") return [];
	return Object.entries(obj as Record<string, unknown>).flatMap(
		([key, value]) => flatEntries(value, prefix ? `${prefix}.${key}` : key),
	);
}

/** Text left once placeholders, tags, code spans and URLs are removed. */
function translatableText(value: string): string {
	return value
		.replace(/\{[^{}]*\}/g, " ")
		.replace(/<[^>]*>/g, " ")
		.replace(/`[^`]*`/g, " ")
		.replace(/https?:\/\/\S+/g, " ")
		.replace(/\/[\w./-]+\.(svg|webp|png|jpg)/g, " ");
}

const MIN_WORDS_OF_A_SENTENCE = 4;

describe("traductions es non traduites", () => {
	const en = new Map(flatEntries(getMessages("en")));
	const es = flatEntries(getMessages("es"));

	it("aucune phrase es n'est une copie de l'anglais (les mots communs aux deux langues sont tolérés)", () => {
		const untranslated = es
			.filter(([key, value]) => en.get(key) === value)
			.filter(
				([, value]) =>
					translatableText(value)
						.split(/\s+/)
						.filter((word) => /[a-zA-Z]{3,}/.test(word)).length >=
					MIN_WORDS_OF_A_SENTENCE,
			)
			.map(([key]) => key);
		expect(untranslated).toEqual([]);
	});
});
