import { Dialect } from "@/expression-language/dialect.enum";
import { LOCALES } from "./config";
import defaultDialectForLocale from "./default-dialect-for-locale";

describe("defaultDialectForLocale", () => {
	it("uses the French dialect for French only", () => {
		expect(defaultDialectForLocale("fr")).toBe(Dialect.FR);
	});

	it.each(LOCALES.filter((locale) => locale !== "fr"))(
		"uses the English dialect for %s",
		(locale) => {
			expect(defaultDialectForLocale(locale)).toBe(Dialect.EN);
		},
	);
});
