/**
 * @jest-environment jsdom
 */
import { JsPdfExporter } from "./jspdf.pdf-exporter";
import {
	PdfCoverPage,
	PdfExportDocument,
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

function makeDoc(overrides: Partial<PdfExportDocument> = {}): PdfExportDocument {
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

jest.mock("jspdf", () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(() => ({
		addPage: mockAddPage,
		save: mockSave,
		text: mockText,
		setFont: mockSetFont,
		setFontSize: mockSetFontSize,
		splitTextToSize: mockSplitTextToSize,
		setDrawColor: jest.fn(),
		line: jest.fn(),
	})),
}));

const mockRenderSceneToJsPdf = jest.fn();
jest.mock("@/ui/lib/program-export-drawing/backends/jspdf-backend", () => ({
	renderSceneToJsPdf: (...args: unknown[]) => mockRenderSceneToJsPdf(...args),
}));

describe("JsPdfExporter", () => {
	beforeEach(() => jest.clearAllMocks());

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
							{ heading: "Section 1", scene: small },
							{ heading: "Section 2", scene: wide },
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
});
