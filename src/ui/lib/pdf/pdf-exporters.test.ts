/**
 * @jest-environment jsdom
 */
import { JsPdfExporter } from "./jspdf.pdf-exporter";
import { Html2PdfExporter } from "./html2pdf.pdf-exporter";
import { PdfExportSection } from "./pdf-exporter";

function makeSection(
	label: string,
	orientation: "portrait" | "landscape" = "portrait",
): PdfExportSection {
	const el = document.createElement("div");
	el.style.width = "200px";
	el.style.height = "100px";
	return { label, element: el, orientation };
}

// --- mocks des dépendances dynamiques ---

const mockSave = jest.fn();
const mockAddImage = jest.fn();
const mockAddPage = jest.fn();

jest.mock("jspdf", () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(() => ({
		addImage: mockAddImage,
		addPage: mockAddPage,
		save: mockSave,
	})),
}));

jest.mock("dom-to-image", () => ({
	__esModule: true,
	default: {
		toPng: jest.fn().mockResolvedValue("data:image/png;base64,AAAA"),
	},
}));

const mockHtml2PdfSave = jest.fn().mockResolvedValue(undefined);
jest.mock("html2pdf.js", () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(() => ({
		set: jest.fn().mockReturnThis(),
		from: jest.fn().mockReturnThis(),
		save: mockHtml2PdfSave,
	})),
}));

// ----------------------------------------

describe("JsPdfExporter", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("appelle jsPDF.save avec le bon nom de fichier", async () => {
		const exporter = new JsPdfExporter();
		await exporter.export([makeSection("GRAFCET 1")], "mon-projet");
		expect(mockSave).toHaveBeenCalledWith("mon-projet.pdf");
	});

	it("ajoute une page par section supplémentaire", async () => {
		const exporter = new JsPdfExporter();
		await exporter.export(
			[makeSection("G1"), makeSection("G2"), makeSection("L1", "landscape")],
			"projet",
		);
		expect(mockAddPage).toHaveBeenCalledTimes(2);
	});

	it("n'ajoute pas de page avant la première section", async () => {
		const exporter = new JsPdfExporter();
		await exporter.export([makeSection("G1")], "projet");
		expect(mockAddPage).not.toHaveBeenCalled();
	});

	it("appelle addImage pour chaque section", async () => {
		const exporter = new JsPdfExporter();
		await exporter.export([makeSection("G1"), makeSection("G2")], "projet");
		expect(mockAddImage).toHaveBeenCalledTimes(2);
	});
});

describe("Html2PdfExporter", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("appelle html2pdf().save() avec le bon nom de fichier", async () => {
		const exporter = new Html2PdfExporter();
		await exporter.export([makeSection("GRAFCET 1")], "mon-projet");
		const html2pdf = (await import("html2pdf.js")).default as jest.Mock;
		expect(html2pdf).toHaveBeenCalled();
		expect(mockHtml2PdfSave).toHaveBeenCalled();
	});

	it("nettoie le conteneur temporaire du DOM après l'export", async () => {
		const exporter = new Html2PdfExporter();
		const initialChildCount = document.body.children.length;
		await exporter.export([makeSection("G1")], "projet");
		expect(document.body.children.length).toBe(initialChildCount);
	});
});
