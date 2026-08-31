/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import JunctionAndStartBuilder from "@/schemas/grafcet/builders/junction-and-start.builder";
import {
	useGrafcetContext,
	useGrafcetStore,
} from "@/ui/components/grafcet/context/GrafcetContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import JunctionAndStartNode, {
	JunctionAndStartNodeType,
} from "./JunctionAndStartNode";

jest.mock("@/ui/components/grafcet/context/GrafcetContext");
jest.mock("@/ui/lib/react-flow/HandleWithConnectionsLimit", () => ({
	__esModule: true,
	default: () => null,
}));

function setup({
	updateNodeData = jest.fn(),
	deleteJunctionBranch = jest.fn(),
} = {}) {
	const junction = new JunctionAndStartBuilder()
		.id("junction-1")
		.position(0, 0)
		.build();

	(useGrafcetContext as jest.Mock).mockReturnValue({
		contextMenuEvents: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
	});
	(useGrafcetStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			workflowManager: { updateNodeData, deleteJunctionBranch },
			highlightedNodesIds: [],
		}),
	);

	const props = {
		id: "junction-1",
		data: junction.data,
		selected: false,
		width: 0,
		type: "junction-and-start",
		position: { x: 0, y: 0 },
		dragging: false,
		zIndex: 0,
		isConnectable: true,
	} as unknown as JunctionAndStartNodeType & { id: string };

	return render(
		<ReactFlowProvider>
			<JunctionAndStartNode {...(props as any)} />
		</ReactFlowProvider>,
	);
}

describe("JunctionAndStartNode", () => {
	it("se rend sans planter, avec une barre par branche", () => {
		const { container } = setup();
		expect(
			container.querySelector(".junction-and-start-node"),
		).toBeInTheDocument();
	});

	it("cliquer la jonction hors d'une barre désélectionne le pin (Delete n'agit plus)", () => {
		const deleteJunctionBranch = jest.fn();
		const { container } = setup({ deleteJunctionBranch });
		const junctionEl = container.querySelector(".junction-node")!;
		const branchBar = container.querySelectorAll(".junction-node__bar")[1];

		fireEvent.pointerDown(branchBar); // sélectionne la branche
		fireEvent.mouseDown(junctionEl); // clic sur le corps de la jonction
		fireEvent.keyDown(junctionEl, { key: "Delete" });

		expect(deleteJunctionBranch).not.toHaveBeenCalled();
	});

	it("cliquer une barre garde le pin sélectionné (Delete supprime la branche)", () => {
		const deleteJunctionBranch = jest.fn();
		const { container } = setup({ deleteJunctionBranch });
		const junctionEl = container.querySelector(".junction-node")!;
		const branchBar = container.querySelectorAll(".junction-node__bar")[1];

		fireEvent.pointerDown(branchBar);
		fireEvent.mouseDown(branchBar);
		fireEvent.keyDown(junctionEl, { key: "Delete" });

		expect(deleteJunctionBranch).toHaveBeenCalledWith(
			"junction-1",
			expect.any(String),
		);
	});
});
