/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
import { usePdfExport, PdfExportProgramConfig } from "./usePdfExport";

const renderUsePdfExport = () =>
	renderHook(() => usePdfExport(), { wrapper: i18nWrapper() });

const mockExport = jest.fn().mockResolvedValue(undefined);
jest.mock("@/ui/lib/pdf/jspdf.pdf-exporter", () => ({
	JsPdfExporter: jest.fn().mockImplementation(() => ({ export: mockExport })),
}));

const mockRenderProgramScenes = jest.fn((config: { type: string }) =>
	config.type === "ladder"
		? [
				{ heading: "Section 1", scene: { ops: [], width: 300, height: 100 } },
				{ heading: "Section 2", scene: { ops: [], width: 300, height: 120 } },
			]
		: [{ scene: { ops: [], width: 100, height: 200 } }],
);
jest.mock("@/ui/lib/program-export-drawing/program-scene", () => ({
	__esModule: true,
	default: (config: unknown) => mockRenderProgramScenes(config as { type: string }),
}));

function makeGrafcet(id: string, name: string): PdfExportProgramConfig {
	return { type: "grafcet", program: { id, name } as never };
}
function makeLadder(id: string, name: string): PdfExportProgramConfig {
	return { type: "ladder", program: { id, name } as never };
}

beforeEach(() => jest.clearAllMocks());

describe("usePdfExport", () => {
	it("rend chaque grafcet en une page et assemble le PDF", async () => {
		const { result } = renderUsePdfExport();

		await act(async () => {
			await result.current.startExport(
				[makeGrafcet("g1", "G1"), makeGrafcet("g2", "G2")],
				"projet",
			);
		});

		expect(mockRenderProgramScenes).toHaveBeenCalledTimes(2);
		expect(mockExport).toHaveBeenCalledTimes(1);
		const doc = mockExport.mock.calls[0][0];
		expect(doc.sections.map((s: { title: string }) => s.title)).toEqual([
			"GRAFCET - G1",
			"GRAFCET - G2",
		]);
		expect(doc.sections[0].scene).toEqual({ ops: [], width: 100, height: 200 });
		expect(doc.filename).toBe("projet");
		expect(result.current.exportState.status).toBe("idle");
	});

	it("découpe un ladder en sous-sections pour l'exporter en flux", async () => {
		const { result } = renderUsePdfExport();

		await act(async () => {
			await result.current.startExport([makeLadder("l1", "L1")], "projet");
		});

		const section = mockExport.mock.calls[0][0].sections[0];
		expect(section.scene).toBeUndefined();
		expect(section.orientation).toBe("landscape");
		expect(section.ladderSections.map((s: { heading: string }) => s.heading)).toEqual([
			"Section 1",
			"Section 2",
		]);
	});

	it("transmet la page de garde", async () => {
		const { result } = renderUsePdfExport();
		const cover = {
			projectName: "P",
			date: "01/09/2026",
			stats: { grafcets: 1, ladders: 0, variables: 0 },
			labels: {
				exportedOn: "Exporté le 01/09/2026",
				stats: "1 grafcet(s), 0 ladder(s), 0 variable(s)",
				statementHeading: "Énoncé",
			},
		};

		await act(async () => {
			await result.current.startExport([makeGrafcet("g1", "G1")], "f", cover);
		});

		expect(mockExport.mock.calls[0][0].cover).toEqual(cover);
	});

	it("passe en erreur si le rendu d'un programme échoue", async () => {
		mockRenderProgramScenes.mockImplementationOnce(() => {
			throw new Error("boom");
		});
		const { result } = renderUsePdfExport();

		await act(async () => {
			await result.current.startExport([makeGrafcet("g1", "G1")], "projet");
		});

		expect(result.current.exportState).toEqual({
			status: "error",
			message: "Le rendu de « G1 » a échoué.",
		});
		expect(mockExport).not.toHaveBeenCalled();
	});

	it("ne fait rien sans programme", async () => {
		const { result } = renderUsePdfExport();

		await act(async () => {
			await result.current.startExport([], "projet");
		});

		expect(result.current.exportState.status).toBe("idle");
		expect(mockExport).not.toHaveBeenCalled();
	});
});
