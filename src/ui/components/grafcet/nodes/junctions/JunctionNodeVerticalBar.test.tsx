/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from "@testing-library/react";
import JunctionNodeVerticalBar from "./JunctionNodeVerticalBar";
import { useJunctionNodeContext } from "./context/JunctionNodeContext";

jest.mock("./context/JunctionNodeContext");
jest.mock("@/ui/components/projects/useCanEditActivePage");
jest.mock("./context/useBarDrag", () => ({
	__esModule: true,
	default: jest.fn(),
}));

const mockSetNodes = jest.fn();
const mockSetEdges = jest.fn();
jest.mock("@xyflow/react", () => ({
	useReactFlow: () => ({ setNodes: mockSetNodes, setEdges: mockSetEdges }),
}));

import useCanEditActivePage from "@/ui/components/projects/useCanEditActivePage";
import useBarDrag from "./context/useBarDrag";

const startDrag = jest.fn();

function setup(
	props: Partial<React.ComponentProps<typeof JunctionNodeVerticalBar>> = {},
	context: Record<string, unknown> = {},
) {
	const selectPivot = jest.fn();
	const selectBranch = jest.fn();
	(useJunctionNodeContext as jest.Mock).mockReturnValue({
		nodeId: "j1",
		width: 200,
		nodeX: 0,
		data: {},
		pivotSelected: false,
		selectedBranchId: null,
		selectPivot,
		selectBranch,
		...context,
	});
	const utils = render(
		<JunctionNodeVerticalBar
			color="black"
			left={50}
			pivot={false}
			branchId="b1"
			{...props}
		/>,
	);
	const bar = utils.container.querySelector(
		".junction-node__bar",
	) as HTMLElement;
	return { bar, selectPivot, selectBranch, ...utils };
}

describe("JunctionNodeVerticalBar", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(useBarDrag as jest.Mock).mockReturnValue(startDrag);
		(useCanEditActivePage as jest.Mock).mockReturnValue(true);
	});

	it("is drawn thin and in its own color when not selected", () => {
		const { bar } = setup();
		const style = getComputedStyle(bar);
		expect(style.width).toBe("1px");
		expect(style.background).toBe("rgb(0, 0, 0)");
	});

	it("is drawn thick and red when its branch is selected", () => {
		const { bar } = setup({}, { selectedBranchId: "b1" });
		const style = getComputedStyle(bar);
		expect(style.width).toBe("4px");
		expect(style.background).toBe("rgb(255, 0, 0)");
	});

	it("is not selected when another branch is selected", () => {
		const { bar } = setup({}, { selectedBranchId: "other" });
		expect(getComputedStyle(bar).width).toBe("1px");
	});

	it("is selected as pivot when the pivot is selected", () => {
		const { bar } = setup(
			{ pivot: true, branchId: undefined },
			{ pivotSelected: true },
		);
		expect(getComputedStyle(bar).width).toBe("4px");
	});

	it("a pivot bar ignores a selected branch", () => {
		const { bar } = setup(
			{ pivot: true, branchId: undefined },
			{ selectedBranchId: "b1" },
		);
		expect(getComputedStyle(bar).width).toBe("1px");
	});

	it("selects its branch and starts a drag on pointer down", () => {
		const { bar, selectBranch, selectPivot } = setup();
		fireEvent.pointerDown(bar);
		expect(selectBranch).toHaveBeenCalledWith("b1");
		expect(selectPivot).not.toHaveBeenCalled();
		expect(startDrag).toHaveBeenCalledTimes(1);
	});

	it("selects its branch but starts no drag when the project cannot be edited", () => {
		(useCanEditActivePage as jest.Mock).mockReturnValue(false);
		const { bar, selectBranch } = setup();
		fireEvent.pointerDown(bar);
		expect(selectBranch).toHaveBeenCalledWith("b1");
		expect(startDrag).not.toHaveBeenCalled();
		expect(getComputedStyle(bar).cursor).toBe("default");
	});

	it("selects the pivot on pointer down for a pivot bar", () => {
		const { bar, selectBranch, selectPivot } = setup({
			pivot: true,
			branchId: undefined,
		});
		fireEvent.pointerDown(bar);
		expect(selectPivot).toHaveBeenCalledTimes(1);
		expect(selectBranch).not.toHaveBeenCalled();
	});

	it("deselects every flow node and edge when grabbed", () => {
		const { bar } = setup();
		fireEvent.pointerDown(bar);
		const nodes = [
			{ id: "a", selected: true },
			{ id: "b", selected: false },
		];
		const edges = [{ id: "e", selected: true }];
		const nodesUpdater = mockSetNodes.mock.calls[0]![0];
		const edgesUpdater = mockSetEdges.mock.calls[0]![0];
		expect(nodesUpdater(nodes)).toEqual([
			{ id: "a", selected: false },
			{ id: "b", selected: false },
		]);
		expect(edgesUpdater(edges)).toEqual([{ id: "e", selected: false }]);
	});

	it("selects nothing but still starts a drag for a non-pivot bar without branchId", () => {
		const { bar, selectBranch, selectPivot } = setup({ branchId: undefined });
		fireEvent.pointerDown(bar);
		expect(selectBranch).not.toHaveBeenCalled();
		expect(selectPivot).not.toHaveBeenCalled();
		expect(mockSetNodes).not.toHaveBeenCalled();
		expect(startDrag).toHaveBeenCalledTimes(1);
	});

	it("stops mousedown and click propagation so the junction is not selected", () => {
		const parentMouseDown = jest.fn();
		const parentClick = jest.fn();
		(useJunctionNodeContext as jest.Mock).mockReturnValue({
			nodeId: "j1",
			width: 200,
			nodeX: 0,
			data: {},
			pivotSelected: false,
			selectedBranchId: null,
			selectPivot: jest.fn(),
			selectBranch: jest.fn(),
		});
		const { container } = render(
			<div onMouseDown={parentMouseDown} onClick={parentClick}>
				<JunctionNodeVerticalBar
					color="black"
					left={50}
					pivot={false}
					branchId="b1"
				/>
			</div>,
		);
		const bar = container.querySelector(".junction-node__bar")!;
		fireEvent.mouseDown(bar);
		fireEvent.click(bar);
		expect(parentMouseDown).not.toHaveBeenCalled();
		expect(parentClick).not.toHaveBeenCalled();
	});
});
