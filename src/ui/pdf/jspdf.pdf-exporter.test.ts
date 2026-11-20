/**
 * @jest-environment jsdom
 */
import { JsPdfExporter } from "./jspdf.pdf-exporter";
import {
	PdfCoverPage,
	PdfExportDocument,
	PDF_PAGE_NUMBER,
	PdfExportSection,
} from "./pdf-exporter";

function makeSection(
	title: string,
	orientation: "portrait" | "landscape" = "portrait",
): PdfExportSection {
	return {
		title,
		scene: { ops: [], width: 800, height: 1131 },
		orientation,
	};
}

const cover: PdfCoverPage = {
	projectName: "Mon projet",
	author: "Alice",
	date: "01/09/2026",
	statement: "Piloter un feu tricolore.",
	stats: { grafcets: 2, ladders: 1, variables: 5 },
	labels: {
		author: "Auteur : Alice",
		exportedOn: "Exporté le 01/09/2026",
		stats: "2 grafcet(s), 1 ladder(s), 5 variable(s)",
		statementHeading: "Énoncé",
	},
};

function makeDoc(
	overrides: Partial<PdfExportDocument> = {},
): PdfExportDocument {
	return {
		filename: "projet",
		sections: [makeSection("GRAFCET — G1")],
		...overrides,
	};
}

// --- mocks des dépendances dynamiques ---

const mockSave = jest.fn();
const mockAddPage = jest.fn();
const mockText = jest.fn();
const mockSetFont = jest.fn();
const mockSetFontSize = jest.fn();
const mockSplitTextToSize = jest.fn((t: string) => [t]);
const mockSetDrawColor = jest.fn();
const mockLine = jest.fn();
const mockSetPage = jest.fn();
const mockSetTextColor = jest.fn();
let mockPageCount = 1;
let mockPageSize = { width: 210, height: 297 };

jest.mock("jspdf", () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(() => ({
		addPage: mockAddPage,
		save: mockSave,
		text: mockText,
		setFont: mockSetFont,
		setFontSize: mockSetFontSize,
		splitTextToSize: mockSplitTextToSize,
		setDrawColor: mockSetDrawColor,
		line: mockLine,
		setPage: mockSetPage,
		setTextColor: mockSetTextColor,
		getNumberOfPages: () => mockPageCount,
		internal: {
			pageSize: {
				getWidth: () => mockPageSize.width,
				getHeight: () => mockPageSize.height,
			},
		},
	})),
}));

const mockRenderSceneToJsPdf = jest.fn();
jest.mock("@/ui/lib/drawing/backends/jspdf-backend", () => ({
	renderSceneToJsPdf: (...args: unknown[]) => mockRenderSceneToJsPdf(...args),
}));

const mockRenderMarkdown = jest.fn();
jest.mock("@/ui/lib/pdf/markdown-to-pdf", () => {
	const actual = jest.requireActual("@/ui/lib/pdf/markdown-to-pdf");
	return {
		__esModule: true,
		default: (...args: unknown[]) => {
			mockRenderMarkdown(...args);
			return actual.default(...args);
		},
	};
});

const mockDrawPdfTable = jest.fn();
jest.mock("@/ui/lib/pdf/pdf-table", () => ({
	drawPdfTable: (...args: unknown[]) => mockDrawPdfTable(...args),
}));

describe("JsPdfExporter", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockPageCount = 1;
		mockPageSize = { width: 210, height: 297 };
	});

	it("enregistre le PDF avec le bon nom de fichier", async () => {
		await new JsPdfExporter().export(makeDoc({ filename: "mon-projet" }));
		expect(mockSave).toHaveBeenCalledWith("mon-projet.pdf");
	});

	it("compresse le document", async () => {
		const jsPDF = (await import("jspdf")).default as unknown as jest.Mock;
		await new JsPdfExporter().export(makeDoc());
		expect(jsPDF).toHaveBeenCalledWith(
			expect.objectContaining({ compress: true }),
		);
	});

	it("n'ajoute pas de page avant la première section, une par section suivante", async () => {
		await new JsPdfExporter().export(
			makeDoc({
				sections: [makeSection("G1"), makeSection("G2"), makeSection("L1")],
			}),
		);
		expect(mockAddPage).toHaveBeenCalledTimes(2);
	});

	it("ajoute une page de garde en tête quand elle est fournie", async () => {
		await new JsPdfExporter().export(
			makeDoc({ cover, sections: [makeSection("G1")] }),
		);
		// garde + section = 1 addPage
		expect(mockAddPage).toHaveBeenCalledTimes(1);
		const printed = mockText.mock.calls.flatMap((c) =>
			Array.isArray(c[0]) ? c[0] : [c[0]],
		);
		expect(printed).toContain("Mon projet");
		expect(printed).toContain("Auteur : Alice");
		expect(printed).toContain("Piloter un feu tricolore.");
	});

	it("imprime le titre de chaque section puis dessine sa scène", async () => {
		const section = makeSection("GRAFCET — Feu tricolore");
		await new JsPdfExporter().export(makeDoc({ sections: [section] }));
		const printed = mockText.mock.calls.flatMap((c) =>
			Array.isArray(c[0]) ? c[0] : [c[0]],
		);
		expect(printed).toContain("GRAFCET — Feu tricolore");
		expect(mockRenderSceneToJsPdf).toHaveBeenCalledTimes(1);
		const [, scene, placement] = mockRenderSceneToJsPdf.mock.calls[0];
		expect(scene).toBe(section.scene);
		expect(placement.scale).toBeGreaterThan(0);
		expect(placement.x).toBeGreaterThanOrEqual(0);
		expect(placement.y).toBeGreaterThan(0);
	});

	it("ouvre les sections paysage en orientation paysage", async () => {
		await new JsPdfExporter().export(
			makeDoc({
				sections: [makeSection("G1"), makeSection("L1", "landscape")],
			}),
		);
		expect(mockAddPage).toHaveBeenLastCalledWith("a4", "landscape");
	});

	it("fait couler les sections d'un ladder à échelle commune, calées à gauche", async () => {
		const small = { ops: [], width: 200, height: 80 };
		const wide = { ops: [], width: 600, height: 90 };
		await new JsPdfExporter().export(
			makeDoc({
				sections: [
					{
						title: "Ladder - L",
						orientation: "landscape",
						ladderSections: [
							{ heading: "Section 1", description: "", scene: small },
							{ heading: "Section 2", description: "", scene: wide },
						],
					},
				],
			}),
		);
		expect(mockRenderSceneToJsPdf).toHaveBeenCalledTimes(2);
		const [callA, callB] = mockRenderSceneToJsPdf.mock.calls;
		// Même échelle pour les deux sections.
		expect(callA[2].scale).toBe(callB[2].scale);
		// Même abscisse d'origine (barre d'alimentation alignée).
		expect(callA[2].x).toBe(callB[2].x);
		// La 2e section est plus bas que la 1re.
		expect(callB[2].y).toBeGreaterThan(callA[2].y);
	});

	it("sépare deux sections de ladder d'une même page par un trait horizontal gris", async () => {
		const a = { ops: [], width: 300, height: 40 };
		const b = { ops: [], width: 300, height: 40 };
		await new JsPdfExporter().export(
			makeDoc({
				sections: [
					{
						title: "Ladder - L",
						orientation: "landscape",
						ladderSections: [
							{ heading: "Section 1", description: "", scene: a },
							{ heading: "Section 2", description: "", scene: b },
						],
					},
				],
			}),
		);
		expect(mockSetDrawColor).toHaveBeenCalledWith(180);
		const horizontalRules = mockLine.mock.calls.filter(
			([x1, y1, x2, y2]) => y1 === y2 && x1 === 15 && x2 === 297 - 15,
		);
		expect(horizontalRules).toHaveLength(1);
	});

	it("imprime la description d'une section de ladder sous son intitulé et décale le dessin", async () => {
		mockSplitTextToSize.mockReturnValueOnce(["Ligne A", "Ligne B"]);
		const withDesc = { ops: [], width: 300, height: 100 };
		const withoutDesc = { ops: [], width: 300, height: 100 };
		await new JsPdfExporter().export(
			makeDoc({
				sections: [
					{
						title: "Ladder - L",
						orientation: "landscape",
						ladderSections: [
							{
								heading: "Section 1",
								description: "Ligne A Ligne B",
								scene: withDesc,
							},
							{ heading: "Section 2", description: "", scene: withoutDesc },
						],
					},
				],
			}),
		);
		const printed = mockText.mock.calls.flatMap((c) =>
			Array.isArray(c[0]) ? c[0] : [c[0]],
		);
		expect(printed).toContain("Ligne A");
		expect(printed).toContain("Ligne B");
		// Le dessin de la 1re section (avec description) commence plus bas que la 2nde n'aurait
		// commencé sans elle : delta = 2 lignes + l'espace description→dessin.
		const [callWithDesc] = mockRenderSceneToJsPdf.mock.calls;
		expect(callWithDesc[2].y).toBeGreaterThan(15 + 12 + 7);
	});

	it("cuts a ladder section description too long for the page and keeps its drawing visible", async () => {
		const lines = Array.from({ length: 200 }, (_, i) => `Ligne ${i}`);
		mockSplitTextToSize.mockReturnValueOnce(lines);
		const scene = { ops: [], width: 300, height: 100 };
		await new JsPdfExporter().export(
			makeDoc({
				sections: [
					{
						title: "Ladder - L",
						orientation: "landscape",
						ladderSections: [
							{ heading: "Section 1", description: "long", scene },
						],
					},
				],
			}),
		);

		const printedLines = mockText.mock.calls.find(
			([text]) => Array.isArray(text) && text[0] === "Ligne 0",
		)?.[0] as string[];
		expect(printedLines.length).toBeLessThan(lines.length);
		expect(printedLines.at(-1)?.endsWith("…")).toBe(true);
		const [[, , placement]] = mockRenderSceneToJsPdf.mock.calls;
		expect(placement.scale).toBeGreaterThan(0);
		expect(placement.y + scene.height * placement.scale).toBeLessThanOrEqual(
			210 - 15 + 0.01,
		);
	});

	it("imprime le titre d'une section tableau puis délègue le tracé du tableau", async () => {
		const table = {
			columns: [{ header: "Mnémonique", width: 50 }],
			rows: [["M0"]],
		};
		await new JsPdfExporter().export(
			makeDoc({
				sections: [
					{ title: "Variables de mémoire", orientation: "landscape", table },
				],
			}),
		);
		const printed = mockText.mock.calls.flatMap((c) =>
			Array.isArray(c[0]) ? c[0] : [c[0]],
		);
		expect(printed).toContain("Variables de mémoire");
		expect(mockDrawPdfTable).toHaveBeenCalledTimes(1);
		expect(mockDrawPdfTable.mock.calls[0][1]).toBe(table);
	});

	it("abaisse l'échelle commune pour qu'une section très haute tienne sur une page", async () => {
		const tall = { ops: [], width: 500, height: 2000 };
		const short = { ops: [], width: 500, height: 120 };
		await new JsPdfExporter().export(
			makeDoc({
				sections: [
					{
						title: "Ladder - L",
						orientation: "landscape",
						ladderSections: [
							{ heading: "Section 1", description: "", scene: short },
							{ heading: "Section 2", description: "", scene: tall },
						],
					},
				],
			}),
		);
		const [callShort, callTall] = mockRenderSceneToJsPdf.mock.calls;
		// Échelle commune conservée.
		expect(callShort[2].scale).toBe(callTall[2].scale);
		const scale = callTall[2].scale;
		// Hauteur utile d'une page (A4 paysage) : (210-15) - 15 (marge basse) - 7 (intitulé).
		const availableSectionHeight = 210 - 15 - 15 - 7;
		expect(tall.height * scale).toBeLessThanOrEqual(
			availableSectionHeight + 0.01,
		);
	});

	describe("en-tête et pied de page", () => {
		const pageFrame = {
			headerLeft: "Mon projet",
			footerLeft: "Auteur : Alice",
			footerRight: "Exporté le 01/09/2026",
		};

		it("n'écrit rien sans cadre de page", async () => {
			await new JsPdfExporter().export(makeDoc());
			expect(mockSetPage).not.toHaveBeenCalled();
			expect(mockText).not.toHaveBeenCalledWith(
				"Exporté le 01/09/2026",
				expect.anything(),
				expect.anything(),
				expect.anything(),
			);
		});

		it("place le projet en haut à gauche, l'auteur en bas à gauche et la date en bas à droite", async () => {
			await new JsPdfExporter().export(makeDoc({ pageFrame }));

			expect(mockText).toHaveBeenCalledWith("Mon projet", 15, 9, {
				align: "left",
			});
			expect(mockText).toHaveBeenCalledWith("Auteur : Alice", 15, 288, {
				align: "left",
			});
			expect(mockText).toHaveBeenCalledWith("Exporté le 01/09/2026", 195, 288, {
				align: "right",
			});
		});

		it("se répète sur chaque page, à la taille de la page", async () => {
			mockPageCount = 2;
			mockPageSize = { width: 297, height: 210 };

			await new JsPdfExporter().export(makeDoc({ pageFrame }));

			expect(mockSetPage).toHaveBeenCalledWith(1);
			expect(mockSetPage).toHaveBeenCalledWith(2);
			const headerCalls = mockText.mock.calls.filter(
				([text]) => text === "Mon projet",
			);
			expect(headerCalls).toHaveLength(2);
			expect(mockText).toHaveBeenCalledWith("Auteur : Alice", 15, 201, {
				align: "left",
			});
			expect(mockText).toHaveBeenCalledWith("Exporté le 01/09/2026", 282, 201, {
				align: "right",
			});
		});

		it("centre les zones centrales et aligne à droite l'en-tête droit", async () => {
			await new JsPdfExporter().export(
				makeDoc({
					pageFrame: {
						headerCenter: "Centre haut",
						headerRight: "Droite haut",
						footerCenter: "Centre bas",
					},
				}),
			);

			expect(mockText).toHaveBeenCalledWith("Centre haut", 105, 9, {
				align: "center",
			});
			expect(mockText).toHaveBeenCalledWith("Droite haut", 195, 9, {
				align: "right",
			});
			expect(mockText).toHaveBeenCalledWith("Centre bas", 105, 288, {
				align: "center",
			});
		});

		it("writes the page number n/N on every page, a single page included", async () => {
			await new JsPdfExporter().export(
				makeDoc({ pageFrame: { footerRight: PDF_PAGE_NUMBER } }),
			);
			expect(mockText).toHaveBeenCalledWith("1/1", 195, 288, {
				align: "right",
			});

			mockText.mockClear();
			mockPageCount = 3;
			await new JsPdfExporter().export(
				makeDoc({ pageFrame: { footerRight: PDF_PAGE_NUMBER } }),
			);
			const numbers = mockText.mock.calls
				.map(([text]) => text)
				.filter((text) => /^\d+\/\d+$/.test(text));
			expect(numbers).toEqual(["1/3", "2/3", "3/3"]);
		});

		it("uses coverPageFrame instead of the frame on the cover page", async () => {
			mockAddPage.mockImplementationOnce(() => {
				mockPageCount = 2;
			});

			await new JsPdfExporter().export(
				makeDoc({
					cover: { ...cover, statement: undefined },
					pageFrame: { headerLeft: "Mon projet", footerRight: PDF_PAGE_NUMBER },
					coverPageFrame: { footerRight: PDF_PAGE_NUMBER },
				}),
			);

			expect(mockSetPage).toHaveBeenNthCalledWith(1, 1);
			const headers = mockText.mock.calls.filter(
				([text, , y]) => text === "Mon projet" && y === 9,
			);
			expect(headers).toHaveLength(1);
			const numbers = mockText.mock.calls
				.map(([text]) => text)
				.filter((text) => /^\d+\/\d+$/.test(text));
			expect(numbers).toEqual(["1/2", "2/2"]);
		});

		it("uses coverPageFrame on every page of a cover that runs over several pages", async () => {
			mockRenderMarkdown.mockImplementationOnce(() => {
				mockPageCount = 2;
			});

			await new JsPdfExporter().export(
				makeDoc({
					cover,
					sections: [],
					pageFrame: { headerLeft: "En-tête courant" },
					coverPageFrame: { footerRight: PDF_PAGE_NUMBER },
				}),
			);

			const pagesWithHeader = mockText.mock.calls.filter(
				([text]) => text === "En-tête courant",
			);
			expect(pagesWithHeader).toHaveLength(0);
			expect(mockText).toHaveBeenCalledWith("2/2", 195, 288, {
				align: "right",
			});
		});

		it("draws the user's text verbatim, page number placeholders included", async () => {
			mockPageCount = 3;

			await new JsPdfExporter().export(
				makeDoc({ pageFrame: { headerLeft: "Lab {page_number}" } }),
			);

			const headers = mockText.mock.calls
				.map(([text]) => text)
				.filter((text) => typeof text === "string" && text.startsWith("Lab"));
			expect(headers).toEqual([
				"Lab {page_number}",
				"Lab {page_number}",
				"Lab {page_number}",
			]);
		});

		it("omet les zones absentes", async () => {
			await new JsPdfExporter().export(
				makeDoc({ pageFrame: { footerRight: "Exporté le 01/09/2026" } }),
			);

			const texts = mockText.mock.calls.map(([text]) => text);
			expect(texts).not.toContain("Mon projet");
			expect(texts).not.toContain("Auteur : Alice");
			expect(texts).toContain("Exporté le 01/09/2026");
		});

		it("rend la couleur du texte au noir ensuite", async () => {
			await new JsPdfExporter().export(makeDoc({ pageFrame }));
			expect(mockSetTextColor).toHaveBeenLastCalledWith(0);
		});
	});
});
