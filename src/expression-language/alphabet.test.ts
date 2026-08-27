import {
	isDigit,
	isLetterOrUnderscore,
	isLetterOrUnderscoreOrDigit,
	isQuote,
} from "./alphabet";

describe("alphabet", () => {
	describe("isLetterOrUnderscore", () => {
		it("returns true for letters", () => {
			expect(isLetterOrUnderscore("a")).toBe(true);
			expect(isLetterOrUnderscore("Z")).toBe(true);
		});

		it("returns true for underscore", () => {
			expect(isLetterOrUnderscore("_")).toBe(true);
		});

		it("returns false for digits", () => {
			expect(isLetterOrUnderscore("5")).toBe(false);
		});

		it("returns false for special characters", () => {
			expect(isLetterOrUnderscore("@")).toBe(false);
		});
	});

	describe("isLetterOrUnderscoreOrDigit", () => {
		it("returns true for letters, underscore, and digits", () => {
			expect(isLetterOrUnderscoreOrDigit("a")).toBe(true);
			expect(isLetterOrUnderscoreOrDigit("_")).toBe(true);
			expect(isLetterOrUnderscoreOrDigit("5")).toBe(true);
		});

		it("returns false for special characters", () => {
			expect(isLetterOrUnderscoreOrDigit("@")).toBe(false);
		});
	});

	describe("isDigit", () => {
		it("returns true for digits", () => {
			expect(isDigit("0")).toBe(true);
			expect(isDigit("9")).toBe(true);
		});

		it("returns false for non-digits", () => {
			expect(isDigit("a")).toBe(false);
			expect(isDigit("_")).toBe(false);
		});
	});

	describe("isQuote", () => {
		it("returns true for single and double quotes", () => {
			expect(isQuote('"')).toBe(true);
			expect(isQuote("'")).toBe(true);
		});

		it("returns false for non-quote characters", () => {
			expect(isQuote("a")).toBe(false);
			expect(isQuote("`")).toBe(false);
		});
	});
});
