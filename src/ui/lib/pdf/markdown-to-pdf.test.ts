import type { jsPDF } from "jspdf";
import { lexer } from "marked";
import renderMarkdownToPdf, { MarkdownPdfLayout } from "./markdown-to-pdf";

const LAYOUT: MarkdownPdfLayout = { x: 15, width: 180, top: 15, bottom: 280 };

interface Call {
	method: string;
	args: unknown[];
}

function fakeDoc() {
	const calls: Call[] = [];
	let font = ["helvetica", "normal"];
	let size = 12;
	const doc = {
		setFont: (...a: string[]) => {
			font = a;
		},
		setFontSize: (s: number) => {
			size = s;
		},
		splitTextToSize: (text: string) => {
			const lines: string[] = [];
			let current = "";
			for (const word of text.split(/\s+/)) {
				if (`${current} ${word}`.trim().length > 40) {
					lines.push(current.trim());
					current = word;
				} else {
					current = `${current} ${word}`;
				}
			}
			if (current.trim()) lines.push(current.trim());
			return lines.length ? lines : [""];
		},
		text: (line: string, x: number, y: number) =>
			calls.push({ method: "text", args: [line, x, y, font.join("/"), size] }),
		addPage: () => calls.push({ method: "addPage", args: [] }),
		setDrawColor: () => {},
		line: () => calls.push({ method: "line", args: [] }),
	};
	return { doc: doc as unknown as jsPDF, calls };
}

const texts = (calls: Call[]) =>
	calls.filter((c) => c.method === "text").map((c) => c.args[0] as string);

describe("renderMarkdownToPdf", () => {
	it("rend les titres en gras", () => {
		const { doc, calls } = fakeDoc();
		renderMarkdownToPdf(doc, lexer("## Feu tricolore"), LAYOUT, 20);
		const heading = calls.find(
			(c) => c.method === "text" && c.args[0] === "Feu tricolore",
		);
		expect(heading).toBeDefined();
		expect(heading!.args[3]).toContain("bold");
	});

	it("aplati les emphases en ligne", () => {
		const { doc, calls } = fakeDoc();
		renderMarkdownToPdf(
			doc,
			lexer("Les sorties **rouge**, `orange` et `vert`."),
			LAYOUT,
			20,
		);
		expect(texts(calls).join(" ")).toContain("rouge, orange et vert.");
	});

	it("préfixe les listes numérotées et à puces", () => {
		const { doc, calls } = fakeDoc();
		renderMarkdownToPdf(doc, lexer("1. un\n2. deux"), LAYOUT, 20);
		expect(texts(calls)).toEqual(
			expect.arrayContaining(["1.", "un", "2.", "deux"]),
		);

		const bullet = fakeDoc();
		renderMarkdownToPdf(bullet.doc, lexer("- a\n- b"), LAYOUT, 20);
		expect(texts(bullet.calls)).toEqual(
			expect.arrayContaining(["•", "a", "•", "b"]),
		);
	});

	it("ajoute une page quand le texte dépasse le bas de zone", () => {
		const { doc, calls } = fakeDoc();
		const long = Array.from({ length: 8 }, (_, i) => `Paragraphe ${i}`).join(
			"\n\n",
		);
		renderMarkdownToPdf(doc, lexer(long), { ...LAYOUT, bottom: 40 }, 30);
		expect(calls.some((c) => c.method === "addPage")).toBe(true);
	});

	it("retourne l'ordonnée finale, croissante", () => {
		const { doc } = fakeDoc();
		const end = renderMarkdownToPdf(doc, lexer("Un paragraphe."), LAYOUT, 20);
		expect(end).toBeGreaterThan(20);
	});
});
