/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import mitt from "mitt";
import { act } from "react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useLadderContext, useLadderStore } from "../context/LadderContext";
import LadderContextMenu from "./LadderContextMenu";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("../context/LadderContext", () => ({
	useLadderContext: jest.fn(),
	useLadderStore: jest.fn(),
}));

const ladderRenderContext = { programName: () => undefined };
jest.mock("@/ui/components/pdf/useLadderRenderContext", () => ({
	__esModule: true,
	default: () => ladderRenderContext,
}));

const exportProgramPdf = jest.fn().mockResolvedValue(undefined);
jest.mock("@/ui/lib/pdf/program-pdf", () => ({
	exportProgramPdf: (...args: unknown[]) => exportProgramPdf(...args),
}));
jest.mock("@/ui/lib/analytics", () => ({ __esModule: true, default: jest.fn() }));

function setup(getAllElements: () => unknown[] = () => [{}]) {
	const ladder = { name: "Pompe", getAllElements };
	const events = mitt();
	(useLadderContext as jest.Mock).mockReturnValue({ contextMenuEvents: events });
	(useLadderStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			ladder,
			workflowManager: {
				getNodes: () => [],
				getEdges: () => [],
			},
			copyCutPasteManager: { pasteElements: jest.fn() },
		}),
	);
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			project: { name: "Mon projet" },
			setCrossReferenceFilter: jest.fn(),
			setCrossReferenceResultVisible: jest.fn(),
		}),
	);
	render(
		<LadderContextMenu
			flowDimensions={{ width: 800, height: 600 }}
			sectionId="s1"
			handleDelete={jest.fn()}
		/>,
		{ wrapper: i18nWrapper() },
	);
	act(() => {
		events.emit("show", {
			sectionId: "s1",
			element: { type: "pane" },
			position: { x: 10, y: 10 },
			screenPosition: { x: 10, y: 10 },
		});
	});
	return { ladder };
}

afterEach(() => jest.clearAllMocks());

describe("LadderContextMenu — export", () => {
	it("exporte le ladder courant au clic sur 'Exporter'", () => {
		const { ladder } = setup();

		fireEvent.click(screen.getByText("Exporter"));

		expect(exportProgramPdf).toHaveBeenCalledWith(
			expect.objectContaining({
				config: { type: "ladder", program: ladder },
				filename: "Mon projet - Pompe",
				sectionTitle: "Ladder - Pompe",
				ladderContext: ladderRenderContext,
			}),
		);
	});

	it("grise 'Exporter' quand le ladder n'a aucun élément", () => {
		setup(() => []);

		expect(screen.getByText("Exporter").closest("li")).toHaveClass(
			"Mui-disabled",
		);
	});
});
