/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import JunctionAndStartBuilder from "@/schemas/grafcet/builders/junction-and-start.builder";
import {
	useGrafcetContext,
	useGrafcetStore,
} from "@/ui/components/grafcet/context/GrafcetContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import JunctionBarsRow from "./JunctionBarsRow";
import JunctionNode from "./JunctionNode";
import JunctionNodeBranchAddButtons from "./JunctionNodeBranchAddButtons";

jest.mock("@/ui/components/grafcet/context/GrafcetContext");
jest.mock("@/ui/lib/react-flow/HandleWithConnectionsLimit", () => ({
	__esModule: true,
	default: () => null,
}));

const junction = new JunctionAndStartBuilder()
	.id("junction-1")
	.position(0, 0)
	.build();
const data = junction.data;

function setup({
	width = 200,
	deleteJunctionBranch = jest.fn(),
	addJunctionBranch = jest.fn(),
}: {
	width?: number;
	deleteJunctionBranch?: jest.Mock;
	addJunctionBranch?: jest.Mock;
} = {}) {
	(useGrafcetContext as jest.Mock).mockReturnValue({
		contextMenuEvents: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
	});
	(useGrafcetStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			workflowManager: {
				updateNodeData: jest.fn(),
				deleteJunctionBranch,
				addJunctionBranch,
			},
			highlightedNodesIds: [],
		}),
	);
	const props = {
		id: "junction-1",
		type: "junction-and-start",
		data,
		selected: false,
		width,
		positionAbsoluteX: 0,
		orientation: "start",
	} as any;
	const utils = render(
		<ReactFlowProvider>
			<JunctionNode {...props} className="custom">
				<JunctionBarsRow data={data} color="black" height="12px" pivot />
				<JunctionBarsRow data={data} color="black" height="13px" />
				<JunctionNodeBranchAddButtons top={20} />
			</JunctionNode>
		</ReactFlowProvider>,
	);
	const node = utils.container.querySelector(".junction-node") as HTMLElement;
	const bars = Array.from(
		utils.container.querySelectorAll<HTMLElement>(".junction-node__bar"),
	);
	return { node, bars, deleteJunctionBranch, addJunctionBranch, ...utils };
}

describe("JunctionNode", () => {
	it("renders its children inside a focusable node carrying the class name", () => {
		const { node, bars } = setup();
		expect(node).toHaveClass("custom");
		expect(node).toHaveAttribute("tabindex", "0");
		expect(bars).toHaveLength(1 + data.branchesOrder.length);
	});

	it("sizes the node with the given width", () => {
		const { node } = setup({ width: 240 });
		expect(getComputedStyle(node).width).toBe("240px");
	});

	it("throws when the width does not snap to the grid", () => {
		jest.spyOn(console, "error").mockImplementation(() => {});
		expect(() => setup({ width: 205 })).toThrow(
			"The width does not snap the grid",
		);
		jest.restoreAllMocks();
	});

	it("focuses the node once a bar is selected", () => {
		const { node, bars } = setup();
		expect(node).not.toHaveFocus();
		fireEvent.pointerDown(bars[1]!);
		expect(node).toHaveFocus();
	});

	it("selecting the pivot bar highlights it", () => {
		const { bars } = setup();
		fireEvent.pointerDown(bars[0]!);
		expect(getComputedStyle(bars[0]!).width).toBe("4px");
		expect(getComputedStyle(bars[1]!).width).toBe("1px");
	});

	it("selecting a branch bar deselects the pivot", () => {
		const { bars } = setup();
		fireEvent.pointerDown(bars[0]!);
		fireEvent.pointerDown(bars[1]!);
		expect(getComputedStyle(bars[0]!).width).toBe("1px");
		expect(getComputedStyle(bars[1]!).width).toBe("4px");
	});

	it("clears the selection on a mousedown outside the node", () => {
		const { bars } = setup();
		fireEvent.pointerDown(bars[1]!);
		fireEvent.mouseDown(document.body, { button: 0 });
		expect(getComputedStyle(bars[1]!).width).toBe("1px");
	});

	it("deletes the selected branch with Delete or Backspace", () => {
		const { node, bars, deleteJunctionBranch } = setup();
		fireEvent.pointerDown(bars[2]!);
		fireEvent.keyDown(node, { key: "Delete" });
		fireEvent.keyDown(node, { key: "Backspace" });
		expect(deleteJunctionBranch).toHaveBeenCalledTimes(2);
		expect(deleteJunctionBranch).toHaveBeenCalledWith(
			"junction-1",
			data.branchesOrder[1],
		);
	});

	it("does not delete anything when the pivot is selected", () => {
		const { node, bars, deleteJunctionBranch } = setup();
		fireEvent.pointerDown(bars[0]!);
		fireEvent.keyDown(node, { key: "Delete" });
		expect(deleteJunctionBranch).not.toHaveBeenCalled();
	});

	it("does not delete anything when no bar is selected", () => {
		const { node, deleteJunctionBranch } = setup();
		fireEvent.keyDown(node, { key: "Delete" });
		expect(deleteJunctionBranch).not.toHaveBeenCalled();
	});

	it("Escape clears the selection", () => {
		const { node, bars } = setup();
		fireEvent.pointerDown(bars[1]!);
		fireEvent.keyDown(node, { key: "Escape" });
		expect(getComputedStyle(bars[1]!).width).toBe("1px");
	});

	it("Shift+ArrowRight moves the selection to the next branch", () => {
		const { node, bars } = setup();
		fireEvent.pointerDown(bars[1]!);
		fireEvent.keyDown(node, { key: "ArrowRight", shiftKey: true });
		expect(getComputedStyle(bars[1]!).width).toBe("1px");
		expect(getComputedStyle(bars[2]!).width).toBe("4px");
	});

	it("renders the add buttons and adds a branch at the clicked slot", () => {
		const { container, addJunctionBranch } = setup();
		const buttons = container.querySelectorAll(
			".junction-node__add-branch-button",
		);
		expect(buttons.length).toBeGreaterThan(0);
		act(() => {
			fireEvent.click(buttons[0]!);
		});
		expect(addJunctionBranch).toHaveBeenCalledWith("junction-1", 0);
	});
});
