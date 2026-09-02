import { LOCALES } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

function flatKeys(obj: unknown, prefix = ""): string[] {
	if (obj === null || typeof obj !== "object") return [prefix];
	return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
		flatKeys(value, prefix ? `${prefix}.${key}` : key),
	);
}

describe("dictionnaires de traduction", () => {
	const reference = "fr" as const;
	const referenceKeys = flatKeys(getMessages(reference)).sort();

	for (const locale of LOCALES) {
		if (locale === reference) continue;

		it(`${locale} a exactement les mêmes clés que ${reference}`, () => {
			expect(flatKeys(getMessages(locale)).sort()).toEqual(referenceKeys);
		});
	}
});
