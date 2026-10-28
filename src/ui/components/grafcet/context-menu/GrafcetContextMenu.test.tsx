/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
import { createClipboardStore } from "@/ui/stores/shared/clipboard.store";
import { selectorImplementation } from "@tests/utils/store-mocks";
import mitt from "mitt";
import { act } from "react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useGrafcetContext, useGrafcetStore } from "../context/GrafcetContext";
import GrafcetContextMenu from "./GrafcetContextMenu";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("../context/GrafcetContext");

const exportProgramPdf = jest.fn().mockResolvedValue(undefined);
jest.mock("@/ui/pdf/program-pdf", () => ({
	exportProgramPdf: (...args: unknown[]) => exportProgramPdf(...args),
}));
jest.mock("@/ui/services/analytics", () => ({
	__esModule: true,
	default: jest.fn(),
}));

const grafcet = { id: "g1", name: "Feu tricolore" };

function setup({
	editingEnabled = true,
	mode = ProjectMode.DESIGN,
	pdfExport = true,
	element = { type: "pane" } as { type: string },
} = {}) {
	const events = mitt();
	(useGrafcetContext as jest.Mock).mockReturnValue({
		contextMenuEvents: events,
	});
	(useGrafcetStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			viewManager: { getNodes: () => [{ id: "n1" }], getEdges: () => [] },
			workflowManager: {},
			copyCutPasteManager: { pasteElements: jest.fn() },
			grafcet,
		}),
	);
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			clipboard: createClipboardStore(),
			mode,
			editingEnabled,
			capabilities: { pdfExport },
			simulationManager: null,
			forcedVariables: undefined,
			project: { name: "Mon projet" },
		}),
	);
	render(<GrafcetContextMenu flowDimensions={{ width: 800, height: 600 }} />, {
		wrapper: i18nWrapper(),
	});
	act(() => {
		events.emit("show", {
			element,
			position: { x: 10, y: 10 },
			screenPosition: { x: 10, y: 10 },
		});
	});
}

afterEach(() => jest.clearAllMocks());

describe("GrafcetContextMenu — export", () => {
	it("exporte le grafcet courant au clic sur 'Exporter'", async () => {
		setup();

		fireEvent.click(screen.getByText("Exporter"));

		await waitFor(() =>
			expect(exportProgramPdf).toHaveBeenCalledWith(
				expect.objectContaining({
					config: { type: "grafcet", program: grafcet },
					filename: "Mon projet - Feu tricolore",
					sectionTitle: "GRAFCET - Feu tricolore",
				}),
			),
		);
	});

	it("ne propose pas l'export quand le store ne sait pas exporter", () => {
		setup({ pdfExport: false });

		expect(screen.queryByText("Exporter")).not.toBeInTheDocument();
		expect(screen.getByText("Coller")).toBeInTheDocument();
	});

	it("n'ouvre pas de menu sur un projet en lecture seule sans export", () => {
		setup({ editingEnabled: false, pdfExport: false });

		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
	});

	it("ne propose que l'export sur un projet en lecture seule", () => {
		setup({ editingEnabled: false });

		expect(screen.getByText("Exporter")).toBeInTheDocument();
	});

	it("n'ouvre pas de menu sur un élément d'un projet en lecture seule", () => {
		setup({
			editingEnabled: false,
			element: { type: "transition", id: "t1", data: {} } as never,
		});

		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
	});
});
