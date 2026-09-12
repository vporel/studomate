/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { useUpdateNodeInternals } from "@xyflow/react";
import { useGrafcetStore } from "@/ui/components/grafcet/context/GrafcetContext";
import { JunctionData } from "@/schemas/grafcet/junction.schema";
import { selectorImplementation } from "@tests/utils/store-mocks";
import useKeyboardEventsHandler from "./useKeyboardEventsHandler";

jest.mock("@/ui/components/grafcet/context/GrafcetContext");
jest.mock("@xyflow/react", () => ({
	useUpdateNodeInternals: jest.fn(),
}));

function fakeKeyboardEvent(
	key: string,
	overrides: Partial<Record<string, unknown>> = {},
) {
	return {
		key,
		ctrlKey: false,
		metaKey: false,
		shiftKey: false,
		preventDefault: jest.fn(),
		stopPropagation: jest.fn(),
		...overrides,
	} as any;
}

/** Jonction canonique à trois branches : b2 est intermédiaire, b1 et b3 sont des extrémités. */
const threeBranches: JunctionData = {
	pivotPosition: 100,
	branches: {
		b1: { id: "b1", position: 10 },
		b2: { id: "b2", position: 100 },
		b3: { id: "b3", position: 190 },
	},
	branchesOrder: ["b1", "b2", "b3"],
};

describe("useKeyboardEventsHandler", () => {
	const updateNodeData = jest.fn();
	const deleteJunctionBranch = jest.fn();
	const applyJunctionBranchDrag = jest.fn();
	const workflowManager = {
		updateNodeData,
		deleteJunctionBranch,
		applyJunctionBranchDrag,
	};
	const updateNodeInternals = jest.fn();
	const selectPreviousBranch = jest.fn();
	const selectNextBranch = jest.fn();
	const clearSelection = jest.fn();

	beforeEach(() => {
		(useGrafcetStore as jest.Mock).mockImplementation(
			selectorImplementation({ workflowManager }),
		);
		(useUpdateNodeInternals as jest.Mock).mockReturnValue(updateNodeInternals);
	});

	afterEach(() => jest.clearAllMocks());

	function setup(
		pivotSelected: boolean,
		selectedBranchId: string | null,
		{
			width = 200,
			nodeX = 300,
			data = threeBranches,
		}: { width?: number; nodeX?: number; data?: JunctionData } = {},
	) {
		const { result } = renderHook(() =>
			useKeyboardEventsHandler(
				"node-1",
				pivotSelected,
				selectedBranchId,
				selectPreviousBranch,
				selectNextBranch,
				clearSelection,
				width,
				nodeX,
				data,
			),
		);
		return result.current;
	}

	it("does nothing when nothing is selected", () => {
		const handler = setup(false, null);
		const event = fakeKeyboardEvent("Escape");

		act(() => handler(event));

		expect(clearSelection).not.toHaveBeenCalled();
		expect(event.preventDefault).not.toHaveBeenCalled();
	});

	it("clears the selection on Escape", () => {
		const handler = setup(true, null);
		const event = fakeKeyboardEvent("Escape");

		act(() => handler(event));

		expect(event.preventDefault).toHaveBeenCalled();
		expect(clearSelection).toHaveBeenCalled();
	});

	it("deletes the selected branch on Delete and swallows the event", () => {
		const handler = setup(false, "b2");
		const event = fakeKeyboardEvent("Delete");

		act(() => handler(event));

		expect(deleteJunctionBranch).toHaveBeenCalledWith("node-1", "b2");
		expect(event.stopPropagation).toHaveBeenCalled();
		expect(event.preventDefault).toHaveBeenCalled();
	});

	it("deletes the selected branch on Backspace too", () => {
		const handler = setup(false, "b2");

		act(() => handler(fakeKeyboardEvent("Backspace")));

		expect(deleteJunctionBranch).toHaveBeenCalledWith("node-1", "b2");
	});

	it("does not delete when the pivot is selected, but still swallows Delete", () => {
		const handler = setup(true, null);
		const event = fakeKeyboardEvent("Delete");

		act(() => handler(event));

		expect(deleteJunctionBranch).not.toHaveBeenCalled();
		expect(event.stopPropagation).toHaveBeenCalled();
	});

	it("selects the previous/next branch on Shift+Arrow without touching the store", () => {
		const handler = setup(false, "b2");

		act(() => handler(fakeKeyboardEvent("ArrowLeft", { shiftKey: true })));
		expect(selectPreviousBranch).toHaveBeenCalled();

		act(() => handler(fakeKeyboardEvent("ArrowRight", { shiftKey: true })));
		expect(selectNextBranch).toHaveBeenCalled();

		expect(updateNodeData).not.toHaveBeenCalled();
	});

	it("moves the pivot left within the grid bounds", () => {
		const handler = setup(true, null);
		const event = fakeKeyboardEvent("ArrowLeft");

		act(() => handler(event));

		expect(updateNodeData).toHaveBeenCalledWith("node-1", expect.any(Function));
		const updater = updateNodeData.mock.calls[0][1];
		expect(updater(threeBranches)).toEqual({ pivotPosition: 90 });
		expect(updateNodeInternals).toHaveBeenCalledWith("node-1");
	});

	it("does not move the pivot past the left grid boundary", () => {
		const handler = setup(true, null);
		act(() => handler(fakeKeyboardEvent("ArrowLeft")));
		const updater = updateNodeData.mock.calls[0][1];
		const prevData = { ...threeBranches, pivotPosition: 10 } as JunctionData;
		expect(updater(prevData)).toEqual({});
	});

	it("moves an inner branch, avoiding overlap with its neighbours", () => {
		const handler = setup(false, "b2");
		act(() => handler(fakeKeyboardEvent("ArrowRight")));
		const updater = updateNodeData.mock.calls[0][1];

		expect(updater(threeBranches)).toEqual({
			branches: { ...threeBranches.branches, b2: { id: "b2", position: 110 } },
		});
	});

	it("resizes the junction when an extreme branch is nudged past the edge", () => {
		const handler = setup(false, "b1");
		act(() => handler(fakeKeyboardEvent("ArrowLeft")));

		expect(updateNodeData).not.toHaveBeenCalled();
		expect(applyJunctionBranchDrag).toHaveBeenCalledWith("node-1", {
			branches: {
				b1: { id: "b1", position: 10 },
				b2: { id: "b2", position: 110 },
				b3: { id: "b3", position: 200 },
			},
			pivotPosition: 110,
			nodeX: 290,
			width: 210,
		});
	});
});
