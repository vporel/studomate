import searchManual, {
	buildSnippet,
	highlightSegments,
	MAX_RESULTS,
	SNIPPET_RADIUS,
} from "@/app/[locale]/user-manual/manual-search";
import type { FlatManualSection } from "@/app/[locale]/user-manual/manual-sections";

const section = (
	id: string,
	label: string,
	extra: Partial<FlatManualSection> = {},
): FlatManualSection => ({ id, label, ...extra });

describe("searchManual", () => {
	const sections = [section("a", "Variables"), section("b", "Simulation")];

	it("returns nothing for an empty or one-character query", () => {
		const contentIndex = { a: "x y z", b: "x" };
		expect(searchManual({ query: "", sections, contentIndex })).toEqual([]);
		expect(searchManual({ query: "   ", sections, contentIndex })).toEqual([]);
		expect(searchManual({ query: "x", sections, contentIndex })).toEqual([]);
		expect(searchManual({ query: " x ", sections, contentIndex })).toEqual([]);
	});

	it("returns nothing when no title or content matches", () => {
		expect(
			searchManual({ query: "zzz", sections, contentIndex: { a: "abc" } }),
		).toEqual([]);
	});

	it("matches French text regardless of case and keeps accents", () => {
		const results = searchManual({
			query: "  ÉTAPE ",
			sections,
			contentIndex: { a: "Chaque étape du GRAFCET est numérotée." },
		});
		expect(results).toHaveLength(1);
		expect(results[0].id).toBe("a");
		expect(results[0].snippet).toBe("Chaque étape du GRAFCET est numérotée.");
		expect(results[0].matchedInLabel).toBe(false);
	});

	it("matches Spanish text", () => {
		const results = searchManual({
			query: "simulación",
			sections: [section("s", "Programas")],
			contentIndex: {
				s: "Pulse Ejecutar para iniciar la Simulación del proyecto.",
			},
		});
		expect(results.map((r) => r.id)).toEqual(["s"]);
		expect(results[0].snippet).toContain("Simulación");
	});

	it("matches the title of a section without a snippet", () => {
		const results = searchManual({
			query: "simul",
			sections,
			contentIndex: {},
		});
		expect(results).toEqual([
			{ id: "b", label: "Simulation", matchedInLabel: true },
		]);
	});

	it("lists title matches before content matches", () => {
		const results = searchManual({
			query: "grafcet",
			sections: [section("first", "Intro"), section("second", "Le GRAFCET")],
			contentIndex: { first: "Un grafcet simple" },
		});
		expect(results.map((r) => [r.id, r.matchedInLabel])).toEqual([
			["second", true],
			["first", false],
		]);
	});

	it("does not search the content of a title that already matches", () => {
		const results = searchManual({
			query: "grafcet",
			sections: [section("a", "Grafcet")],
			contentIndex: { a: "Le grafcet" },
		});
		expect(results).toHaveLength(1);
		expect(results[0].snippet).toBeUndefined();
	});

	it("matches a child through its parent's title", () => {
		const results = searchManual({
			query: "ladder",
			sections: [section("c", "Contacts", { parentLabel: "Ladder" })],
			contentIndex: {},
		});
		expect(results.map((r) => r.id)).toEqual(["c"]);
		expect(results[0].matchedInLabel).toBe(true);
	});

	it("skips the content of a section with sub-sections but not its title", () => {
		const parent = section("p", "Éditeurs", { hasChildren: true });
		const child = section("k", "Détails", { parentLabel: "Éditeurs" });
		const contentIndex = { p: "mot rare", k: "mot rare" };
		expect(
			searchManual({
				query: "rare",
				sections: [parent, child],
				contentIndex,
			}).map((r) => r.id),
		).toEqual(["k"]);
		expect(
			searchManual({ query: "éditeurs", sections: [parent], contentIndex }).map(
				(r) => r.id,
			),
		).toEqual(["p"]);
	});

	it("limits the results to MAX_RESULTS", () => {
		const many = Array.from({ length: MAX_RESULTS + 5 }, (_, i) =>
			section(`s${i}`, `Section ${i}`),
		);
		const contentIndex = Object.fromEntries(
			many.map((s) => [s.id, "contenu commun"]),
		);
		const results = searchManual({
			query: "commun",
			sections: many,
			contentIndex,
		});
		expect(results).toHaveLength(MAX_RESULTS);
		expect(results[0].id).toBe("s0");
	});

	it("treats regex metacharacters in the query literally", () => {
		const results = searchManual({
			query: "a.c(",
			sections,
			contentIndex: { a: "abc( a.c( fin" },
		});
		expect(results[0].snippet).toBe("abc( a.c( fin");
	});
});

describe("buildSnippet", () => {
	it("returns undefined without a match", () => {
		expect(buildSnippet("abc", "zz")).toBeUndefined();
	});

	it("adds no ellipsis when the whole text fits", () => {
		expect(buildSnippet("un mot court", "mot")).toBe("un mot court");
	});

	it("adds a trailing ellipsis for a match at the start", () => {
		const text = `cible ${"x".repeat(200)}`;
		const snippet = buildSnippet(text, "cible") as string;
		expect(snippet.startsWith("…")).toBe(false);
		expect(snippet.endsWith("…")).toBe(true);
		expect(snippet).toBe(`${text.slice(0, 5 + SNIPPET_RADIUS)}…`);
	});

	it("adds both ellipses for a match in the middle", () => {
		const text = `${"a".repeat(100)}cible${"b".repeat(100)}`;
		const snippet = buildSnippet(text, "cible") as string;
		expect(snippet.startsWith("…")).toBe(true);
		expect(snippet.endsWith("…")).toBe(true);
		expect(snippet).toBe(
			`…${"a".repeat(SNIPPET_RADIUS)}cible${"b".repeat(SNIPPET_RADIUS)}…`,
		);
	});

	it("adds a leading ellipsis for a match at the end", () => {
		const text = `${"a".repeat(200)} cible`;
		const snippet = buildSnippet(text, "cible") as string;
		expect(snippet.startsWith("…")).toBe(true);
		expect(snippet.endsWith("…")).toBe(false);
		expect(snippet.endsWith("cible")).toBe(true);
	});

	it("centres the snippet on the match when toLowerCase changes the text length", () => {
		const text = `${"İ".repeat(60)} cible ${"x".repeat(80)}`;
		const snippet = buildSnippet(text, "cible") as string;
		expect(snippet).toContain("cible");
		expect(snippet).toBe(
			`…${text.slice(61 - SNIPPET_RADIUS, 61)}cible${text.slice(66, 66 + SNIPPET_RADIUS)}…`,
		);
	});
});

describe("highlightSegments", () => {
	it("returns the whole text unmatched for an empty query", () => {
		expect(highlightSegments("abc", "")).toEqual([
			{ text: "abc", match: false },
		]);
	});

	it("returns the whole text unmatched without a match", () => {
		expect(highlightSegments("abc", "zz")).toEqual([
			{ text: "abc", match: false },
		]);
	});

	it("highlights a match at the start", () => {
		expect(highlightSegments("Grafcet simple", "graf")).toEqual([
			{ text: "Graf", match: true },
			{ text: "cet simple", match: false },
		]);
	});

	it("highlights a match in the middle, keeping the original case", () => {
		expect(highlightSegments("un Étape ici", "étape")).toEqual([
			{ text: "un ", match: false },
			{ text: "Étape", match: true },
			{ text: " ici", match: false },
		]);
	});

	it("highlights a match at the end", () => {
		expect(highlightSegments("fin de ligne", "ligne")).toEqual([
			{ text: "fin de ", match: false },
			{ text: "ligne", match: true },
		]);
	});

	it("highlights the right portion when toLowerCase changes the text length", () => {
		expect(highlightSegments("İİ cible fin", "cible")).toEqual([
			{ text: "İİ ", match: false },
			{ text: "cible", match: true },
			{ text: " fin", match: false },
		]);
	});
});
