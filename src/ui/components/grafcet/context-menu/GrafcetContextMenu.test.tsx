/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
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
jest.mock("@/ui/lib/pdf/program-pdf", () => ({
	exportProgramPdf: (...args: unknown[]) => exportProgramPdf(...args),
}));
jest.mock("@/ui/lib/analytics", () => ({ __esModule: true, default: jest.fn() }));

const grafcet = { id: "g1", name: "Feu tricolore" };

function setup() {
	const events = mitt();
	(useGrafcetContext as jest.Mock).mockReturnValue({ contextMenuEvents: events });
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
			mode: ProjectMode.DESIGN,
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
			element: { type: "pane" },
			position: { x: 10, y: 10 },
			screenPosition: { x: 10, y: 10 },
		});
	});
}

afterEach(() => jest.clearAllMocks());

describe("GrafcetContextMenu — export", () => {
	it("exporte le grafcet courant au clic sur 'Exporter'", () => {
		setup();

		fireEvent.click(screen.getByText("Exporter"));

		expect(exportProgramPdf).toHaveBeenCalledWith(
			expect.objectContaining({
				config: { type: "grafcet", program: grafcet },
				filename: "Mon projet - Feu tricolore",
				sectionTitle: "GRAFCET - Feu tricolore",
			}),
		);
	});
});
