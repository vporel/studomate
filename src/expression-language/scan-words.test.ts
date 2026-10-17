import scanWords from "./scan-words";

function words(expression: string) {
	const found: [string, number, number][] = [];
	scanWords(expression, (word, start, end) => found.push([word, start, end]));
	return found;
}

describe("scanWords", () => {
	it("reports identifiers and keywords with their offsets", () => {
		expect(words("A ET moteur_1")).toEqual([
			["A", 0, 1],
			["ET", 2, 4],
			["moteur_1", 5, 13],
		]);
	});

	it("returns nothing for an empty expression", () => {
		expect(words("")).toEqual([]);
	});

	it.each(["'abc' X", '"abc" X'])(
		"skips the content of a string literal (%s)",
		(expression) => {
			expect(words(expression).map(([w]) => w)).toEqual(["X"]);
		},
	);

	it("does not throw on an unterminated string and ignores what follows", () => {
		expect(words("A 'abc def")).toEqual([["A", 0, 1]]);
	});

	it.each(["100ms", "2.5s"])(
		"does not read the unit of %s as a word",
		(literal) => {
			expect(words(`${literal} X`).map(([w]) => w)).toEqual(["X"]);
		},
	);

	it("skips a TIME constant and reports the identifier after it", () => {
		expect(words("T#5s Y").map(([w]) => w)).toEqual(["Y"]);
	});

	it("skips characters outside the alphabet without breaking the next words", () => {
		expect(words("A, % é B").map(([w]) => w)).toEqual(["A", "B"]);
	});
});
