import { Keyword } from "./keyword.enum";
import { getKeywordByString, getKeywordsStringsForDialect } from "./keywords";
import { Dialect } from "./dialect.enum";

describe("keywords", () => {
	describe("getKeywordsStringsForDialect", () => {
		it("returns French keywords for FR language", () => {
			const keywords = getKeywordsStringsForDialect(Dialect.FR);
			expect(keywords).toContain("VRAI");
			expect(keywords).toContain("FAUX");
			expect(keywords).toContain("ET");
			expect(keywords).toContain("OU");
			expect(keywords).toContain("NON");
		});

		it("returns English keywords for EN language", () => {
			const keywords = getKeywordsStringsForDialect(Dialect.EN);
			expect(keywords).toContain("TRUE");
			expect(keywords).toContain("FALSE");
			expect(keywords).toContain("AND");
			expect(keywords).toContain("OR");
			expect(keywords).toContain("NOT");
		});
	});

	describe("getKeywordByString", () => {
		it("returns correct keyword for French strings", () => {
			expect(getKeywordByString("VRAI", Dialect.FR)).toBe(Keyword.TRUE);
			expect(getKeywordByString("vrai", Dialect.FR)).toBe(Keyword.TRUE);
			expect(getKeywordByString("ET", Dialect.FR)).toBe(Keyword.AND);
		});

		it("returns correct keyword for English strings", () => {
			expect(getKeywordByString("TRUE", Dialect.EN)).toBe(Keyword.TRUE);
			expect(getKeywordByString("true", Dialect.EN)).toBe(Keyword.TRUE);
			expect(getKeywordByString("AND", Dialect.EN)).toBe(Keyword.AND);
		});

		it("returns null for non-keyword strings", () => {
			expect(getKeywordByString("variable", Dialect.FR)).toBe(null);
		});
	});
});
