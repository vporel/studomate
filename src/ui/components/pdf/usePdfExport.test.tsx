/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import {
	excludeEditorChrome,
	usePdfExport,
	PdfExportProgramConfig,
} from "./usePdfExport";

const mockExport = jest.fn().mockResolvedValue(undefined);
jest.mock("@/ui/lib/pdf/jspdf.pdf-exporter", () => ({
	JsPdfExporter: jest.fn().mockImplementation(() => ({ export: mockExport })),
}));

const mockToPng = jest.fn().mockResolvedValue("data:image/png;base64,AAAA");
jest.mock("dom-to-image", () => ({
	__esModule: true,
	default: {
		get toPng() {
			return mockToPng;
		},
	},
}));

function makeProgram(id: string, name: string): PdfExportProgramConfig {
	return { type: "grafcet", program: { id, name } as never };
}

function makeElement(): HTMLElement {
	const el = document.createElement("div");
	Object.defineProperty(el, "offsetWidth", { value: 1200 });
	Object.defineProperty(el, "offsetHeight", { value: 900 });
	return el;
}

beforeEach(() => {
	jest.clearAllMocks();
	// rAF synchrone : `nextFrame` se résout alors sur une microtask, sans dépendre du timer jsdom.
	jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
		cb(0);
		return 0;
	});
});

/** Fait avancer l'export : attend que le programme courant soit monté, vérifie qu'il est
 * seul, puis simule son signal « prêt ». */
async function drainProgram(
	result: { current: ReturnType<typeof usePdfExport> },
	expectedId: string,
) {
	await act(async () => {
		await Promise.resolve();
	});
	expect(result.current.offscreenPrograms).toHaveLength(1);
	expect(result.current.offscreenPrograms[0].program.id).toBe(expectedId);
	await act(async () => {
		result.current.onProgramReady(expectedId, makeElement());
		await Promise.resolve();
	});
}

describe("usePdfExport", () => {
	it("monte, capture et démonte les programmes un par un", async () => {
		const { result } = renderHook(() => usePdfExport());

		let done: Promise<void>;
		act(() => {
			done = result.current.startExport(
				[makeProgram("g1", "G1"), makeProgram("g2", "G2")],
				"projet",
			);
		});

		await drainProgram(result, "g1");
		await drainProgram(result, "g2");

		await act(async () => {
			await done;
		});

		expect(mockToPng).toHaveBeenCalledTimes(2);
		expect(mockExport).toHaveBeenCalledTimes(1);
		const doc = mockExport.mock.calls[0][0];
		expect(doc.sections.map((s: { title: string }) => s.title)).toEqual([
			"GRAFCET - G1",
			"GRAFCET - G2",
		]);
		expect(doc.filename).toBe("projet");
		expect(result.current.exportState.status).toBe("idle");
		expect(result.current.offscreenPrograms).toHaveLength(0);
	});

	it("transmet la page de garde et sur-échantillonne la capture", async () => {
		const { result } = renderHook(() => usePdfExport());
		const cover = {
			projectName: "P",
			date: "01/09/2026",
			stats: { grafcets: 1, ladders: 0, variables: 0 },
		};

		let done: Promise<void>;
		act(() => {
			done = result.current.startExport(
				[makeProgram("g1", "G1")],
				"f",
				cover,
			);
		});
		await drainProgram(result, "g1");
		await act(async () => {
			await done;
		});

		expect(mockExport.mock.calls[0][0].cover).toEqual(cover);
		const opts = mockToPng.mock.calls[0][1];
		expect(opts.width).toBe(1200 * 3);
		expect(opts.style.transform).toBe("scale(3)");
	});

	it("passe en erreur et démonte tout si une capture échoue", async () => {
		mockToPng.mockRejectedValueOnce(new Error("boom"));
		const { result } = renderHook(() => usePdfExport());

		let done: Promise<void>;
		act(() => {
			done = result.current.startExport([makeProgram("g1", "G1")], "projet");
		});

		await drainProgram(result, "g1");
		await act(async () => {
			await done;
		});

		expect(result.current.exportState).toEqual({
			status: "error",
			message: 'La capture de "G1" a échoué.',
		});
		expect(result.current.offscreenPrograms).toHaveLength(0);
		expect(mockExport).not.toHaveBeenCalled();
	});

	it("exclut l'habillage éditeur (grille, panneaux, poignées) de la capture", () => {
		const grid = document.createElement("div");
		grid.className = "react-flow__background";
		const handle = document.createElement("div");
		handle.className = "react-flow__handle react-flow__handle-bottom";
		const node = document.createElement("div");
		node.className = "react-flow__node";
		expect(excludeEditorChrome(grid)).toBe(false);
		expect(excludeEditorChrome(handle)).toBe(false);
		expect(excludeEditorChrome(node)).toBe(true);
		expect(excludeEditorChrome(document.createTextNode("x"))).toBe(true);
	});

	it("ne fait rien sans programme", async () => {
		const { result } = renderHook(() => usePdfExport());

		await act(async () => {
			await result.current.startExport([], "projet");
		});

		expect(result.current.exportState.status).toBe("idle");
		expect(mockExport).not.toHaveBeenCalled();
	});
});
