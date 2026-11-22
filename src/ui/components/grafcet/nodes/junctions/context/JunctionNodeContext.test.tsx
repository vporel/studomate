/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render } from "@testing-library/react";
import JunctionAndStartBuilder from "@/schemas/grafcet/builders/junction-and-start.builder";
import {
	useGrafcetContext,
	useGrafcetStore,
} from "@/ui/components/grafcet/context/GrafcetContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import {
	JunctionNodeContextProvider,
	useJunctionNodeContext,
} from "./JunctionNodeContext";

jest.mock("@/ui/components/grafcet/context/GrafcetContext");

const junction = new JunctionAndStartBuilder()
	.id("junction-1")
	.position(0, 0)
	.build();
const data = junction.data;
const [firstBranch, secondBranch] = data.branchesOrder;

let ctx: ReturnType<typeof useJunctionNodeContext>;
const Probe = () => {
	ctx = useJunctionNodeContext();
	return null;
};

function setup(addJunctionBranch = jest.fn()) {
	(useGrafcetContext as jest.Mock).mockReturnValue({
		contextMenuEvents: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
	});
	(useGrafcetStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ workflowManager: { addJunctionBranch } }),
	);
	return render(
		<JunctionNodeContextProvider
			id="junction-1"
			data={data}
			width={200}
			nodeX={40}
		>
			<Probe />
		</JunctionNodeContextProvider>,
	);
}

describe("JunctionNodeContextProvider", () => {
	it("exposes the node identity, geometry and data", () => {
		setup();
		expect(ctx).toMatchObject({
			nodeId: "junction-1",
			width: 200,
			nodeX: 40,
			data,
		});
	});

	it("starts with nothing selected", () => {
		setup();
		expect(ctx.pivotSelected).toBe(false);
		expect(ctx.selectedBranchId).toBeNull();
	});

	it("selects the pivot then a branch, one excluding the other", () => {
		setup();
		act(() => ctx.selectPivot());
		expect(ctx.pivotSelected).toBe(true);
		act(() => ctx.selectBranch(firstBranch));
		expect(ctx.pivotSelected).toBe(false);
		expect(ctx.selectedBranchId).toBe(firstBranch);
	});

	it("moves the selection between branches", () => {
		setup();
		act(() => ctx.selectBranch(firstBranch));
		act(() => ctx.selectNextBranch());
		expect(ctx.selectedBranchId).toBe(secondBranch);
		act(() => ctx.selectPreviousBranch());
		expect(ctx.selectedBranchId).toBe(firstBranch);
	});

	it("clears the selection on a left mousedown outside the node", () => {
		setup();
		act(() => ctx.selectBranch(firstBranch));
		fireEvent.mouseDown(document.body, { button: 0 });
		expect(ctx.selectedBranchId).toBeNull();
		expect(ctx.pivotSelected).toBe(false);
	});

	it("keeps the selection on a non-left mousedown", () => {
		setup();
		act(() => ctx.selectPivot());
		fireEvent.mouseDown(document.body, { button: 2 });
		expect(ctx.pivotSelected).toBe(true);
	});

	it("provides one add button position per insertion slot", () => {
		setup();
		expect(ctx.branchAddButtonsPositions.map((b) => b.insertIndex)).toEqual([
			0, 1, 2,
		]);
	});

	it("delegates onBranchAdd to the workflow manager", () => {
		const addJunctionBranch = jest.fn();
		setup(addJunctionBranch);
		act(() => ctx.onBranchAdd(1));
		expect(addJunctionBranch).toHaveBeenCalledWith("junction-1", 1);
	});

	it("falls back to inert defaults outside a provider", () => {
		render(<Probe />);
		expect(ctx.nodeId).toBe("");
		expect(ctx.branchAddButtonsPositions).toEqual([]);
		expect(() => ctx.selectPivot()).not.toThrow();
	});
});
