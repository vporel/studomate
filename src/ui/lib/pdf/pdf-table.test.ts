import {
	DEFAULT_TABLE_STYLE,
	layoutPdfTable,
	PdfTableArea,
	PdfTableModel,
} from "./pdf-table";

/** Mesure factice : ~2 mm par caractère, coupe aux espaces. */
const measure = (text: string, width: number): string[] => {
	if (text === "") return [""];
	const maxChars = Math.max(1, Math.floor(width / 2));
	const lines: string[] = [];
	let current = "";
	for (const word of text.split(" ")) {
		const candidate = current ? `${current} ${word}` : word;
		if (current && candidate.length > maxChars) {
			lines.push(current);
			current = word;
		} else {
			current = candidate;
		}
	}
	if (current) lines.push(current);
	return lines;
};

const area: PdfTableArea = { x: 15, top: 30, pageTop: 15, bottom: 200 };

function tableOf(rows: string[][]): PdfTableModel {
	return {
		columns: [
			{ header: "Mnémonique", width: 50, mono: true },
			{ header: "Commentaire", width: 60 },
		],
		rows,
	};
}

describe("layoutPdfTable", () => {
	it("répète la ligne d'en-tête en tête de chaque page", () => {
		const rows = Array.from({ length: 60 }, (_, i) => [`M${i}`, ""]);
		const pages = layoutPdfTable(tableOf(rows), area, DEFAULT_TABLE_STYLE, measure);

		expect(pages.length).toBeGreaterThan(1);
		for (const page of pages) {
			expect(page.rows[0].header).toBe(true);
			expect(page.rows[0].cells[0]).toEqual(["Mnémonique"]);
		}
		const bodyRows = pages.flatMap((p) => p.rows.filter((r) => !r.header));
		expect(bodyRows).toHaveLength(60);
	});

	it("agrandit la hauteur de ligne quand une cellule est renvoyée à la ligne", () => {
		const shortRow = tableOf([["M0", "ok"]]);
		const longRow = tableOf([
			["M0", "mot ".repeat(40).trim()],
		]);

		const short = layoutPdfTable(shortRow, area, DEFAULT_TABLE_STYLE, measure)[0]
			.rows[1];
		const long = layoutPdfTable(longRow, area, DEFAULT_TABLE_STYLE, measure)[0]
			.rows[1];

		expect(long.height).toBeGreaterThan(short.height * 3);
	});

	it("ne casse pas une page qui ne contient que l'en-tête", () => {
		const tall = tableOf([["M0", "mot ".repeat(200).trim()]]);
		const pages = layoutPdfTable(tall, area, DEFAULT_TABLE_STYLE, measure);

		expect(pages).toHaveLength(1);
		expect(pages[0].rows).toHaveLength(2);
	});

	it("positionne chaque ligne sous la précédente sur une page", () => {
		const pages = layoutPdfTable(
			tableOf([
				["M0", ""],
				["M1", ""],
			]),
			area,
			DEFAULT_TABLE_STYLE,
			measure,
		);
		const [header, r0, r1] = pages[0].rows;
		expect(header.y).toBe(area.top);
		expect(r0.y).toBe(header.y + header.height);
		expect(r1.y).toBe(r0.y + r0.height);
	});
});
