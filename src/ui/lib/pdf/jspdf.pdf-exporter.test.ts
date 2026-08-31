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
		imageDataUrl: "data:image/png;base64,AAAA",
		imageWidth: 800,
		imageHeight: 1131,
		orientation,
	};
}

const cover: PdfCoverPage = {
	projectName: "Mon projet",
	author: "Alice",
	date: "01/09/2026",
	statement: "Piloter un feu tricolore.",
	stats: { grafcets: 2, ladders: 1, variables: 5 },
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
const mockAddImage = jest.fn();
const mockAddPage = jest.fn();
const mockText = jest.fn();
const mockSetFont = jest.fn();
const mockSetFontSize = jest.fn();
const mockSplitTextToSize = jest.fn((t: string) => [t]);

jest.mock("jspdf", () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(() => ({
		addImage: mockAddImage,
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

describe("JsPdfExporter", () => {
	beforeEach(() => jest.clearAllMocks());

	it("enregistre le PDF avec le bon nom de fichier", async () => {
		await new JsPdfExporter().export(makeDoc({ filename: "mon-projet" }));
		expect(mockSave).toHaveBeenCalledWith("mon-projet.pdf");
	});

	it("compresse le document et les images", async () => {
		const jsPDF = (await import("jspdf")).default as unknown as jest.Mock;
		await new JsPdfExporter().export(makeDoc());
		expect(jsPDF).toHaveBeenCalledWith(
			expect.objectContaining({ compress: true }),
		);
		expect(mockAddImage.mock.calls[0][7]).toBe("SLOW");
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

	it("imprime le titre de chaque section puis place son image", async () => {
		await new JsPdfExporter().export(
			makeDoc({ sections: [makeSection("GRAFCET — Feu tricolore")] }),
		);
		const printed = mockText.mock.calls.flatMap((c) =>
			Array.isArray(c[0]) ? c[0] : [c[0]],
		);
		expect(printed).toContain("GRAFCET — Feu tricolore");
		const args = mockAddImage.mock.calls[0];
		expect(args[0]).toBe("data:image/png;base64,AAAA");
		expect(args[1]).toBe("PNG");
	});

	it("ouvre les sections paysage en orientation paysage", async () => {
		await new JsPdfExporter().export(
			makeDoc({
				sections: [makeSection("G1"), makeSection("L1", "landscape")],
			}),
		);
		expect(mockAddPage).toHaveBeenLastCalledWith("a4", "landscape");
	});
});
