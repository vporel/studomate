import { buildProgramSection, exportProgramPdf } from "./program-pdf";

const mockExport = jest.fn().mockResolvedValue(undefined);
jest.mock("./jspdf.pdf-exporter", () => ({
	JsPdfExporter: jest.fn().mockImplementation(() => ({ export: mockExport })),
}));

const mockRenderProgramScenes = jest.fn((config: { type: string }) =>
	config.type === "ladder"
		? [
				{
					heading: "Réseau 1",
					description: "Marche/arrêt",
					scene: { ops: [], width: 300, height: 100 },
				},
				{ heading: "Réseau 2", scene: { ops: [], width: 300, height: 120 } },
			]
		: [{ scene: { ops: [], width: 100, height: 200 } }],
);
jest.mock("@/ui/lib/program-export-drawing/program-scene", () => ({
	__esModule: true,
	default: (config: unknown) =>
		mockRenderProgramScenes(config as { type: string }),
}));

const grafcet = { type: "grafcet", program: { id: "g1", name: "Feu" } } as never;
const ladder = { type: "ladder", program: { id: "l1", name: "Pompe" } } as never;

beforeEach(() => jest.clearAllMocks());

describe("buildProgramSection", () => {
	it("produit une section portrait à scène unique pour un GRAFCET", () => {
		const section = buildProgramSection(grafcet, "GRAFCET - Feu");

		expect(section.orientation).toBe("portrait");
		expect(section.scene).toEqual({ ops: [], width: 100, height: 200 });
		expect(section.ladderSections).toBeUndefined();
	});

	it("produit une section paysage, une scène par section, pour un ladder", () => {
		const section = buildProgramSection(ladder, "Ladder - Pompe");

		expect(section.orientation).toBe("landscape");
		expect(section.ladderSections).toHaveLength(2);
		expect(section.ladderSections?.[0].heading).toBe("Réseau 1");
		expect(section.ladderSections?.[0].description).toBe("Marche/arrêt");
		expect(section.ladderSections?.[1].description).toBe("");
	});

	it("propage l'erreur si le rendu d'une scène échoue", () => {
		mockRenderProgramScenes.mockImplementationOnce(() => {
			throw new Error("boom");
		});

		expect(() => buildProgramSection(grafcet, "GRAFCET - Feu")).toThrow("boom");
	});
});

describe("exportProgramPdf", () => {
	it("assemble un PDF d'une seule section, sans page de garde", async () => {
		await exportProgramPdf({
			config: grafcet,
			filename: "Projet - Feu",
			sectionTitle: "GRAFCET - Feu",
		});

		expect(mockExport).toHaveBeenCalledWith(
			expect.objectContaining({
				filename: "Projet - Feu",
				sections: expect.arrayContaining([
					expect.objectContaining({ title: "GRAFCET - Feu" }),
				]),
			}),
		);
		expect(mockExport.mock.calls[0][0].cover).toBeUndefined();
	});

	it("rejette si l'assemblage échoue", async () => {
		mockExport.mockRejectedValueOnce(new Error("io"));

		await expect(
			exportProgramPdf({
				config: grafcet,
				filename: "Projet - Feu",
				sectionTitle: "GRAFCET - Feu",
			}),
		).rejects.toThrow("io");
	});
});
