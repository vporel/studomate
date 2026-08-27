/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { useUpdateNodeInternals } from "@xyflow/react";
import { useGrafcetStore } from "@/ui/components/grafcet/context/GrafcetContext";
import { JunctionData } from "@/schemas/grafcet/junction.schema";
import { selectorImplementation } from "@tests/utils/store-mocks";
import useBranchActions from "./useBranchActions";

jest.mock("@/ui/components/grafcet/context/GrafcetContext");
jest.mock("@xyflow/react", () => ({
	useUpdateNodeInternals: jest.fn(),
}));

function makeNodeData(overrides: Partial<JunctionData>): JunctionData {
	return {
		pivotPosition: 100,
		branches: {},
		branchesOrder: [],
		...overrides,
	} as JunctionData;
}

describe("useBranchActions", () => {
	const updateNodeData = jest.fn();
	const workflowManager = { updateNodeData };
	const updateNodeInternals = jest.fn();

	beforeEach(() => {
		(useGrafcetStore as jest.Mock).mockImplementation(
			selectorImplementation({ workflowManager }),
		);
		(useUpdateNodeInternals as jest.Mock).mockReturnValue(updateNodeInternals);
	});

	afterEach(() => jest.clearAllMocks());

	it("adds a centered branch when there are none yet", () => {
		const nodeData = makeNodeData({});
		const { result } = renderHook(() =>
			useBranchActions("node-1", nodeData, 200),
		);

		act(() => result.current.add(0));

		expect(updateNodeData).toHaveBeenCalledTimes(1);
		const [nodeId, patch] = updateNodeData.mock.calls[0];
		expect(nodeId).toBe("node-1");
		expect(patch.branchesOrder).toHaveLength(1);
		const newBranchId = patch.branchesOrder[0];
		expect(patch.branches[newBranchId].position).toBe(100);
		expect(updateNodeInternals).toHaveBeenCalledWith("node-1");
	});

	it("inserts a branch between two existing branches", () => {
		const nodeData = makeNodeData({
			branches: { a: { id: "a", position: 60 }, b: { id: "b", position: 140 } },
			branchesOrder: ["a", "b"],
		});
		const { result } = renderHook(() =>
			useBranchActions("node-1", nodeData, 200),
		);

		act(() => result.current.add(1));

		const [, patch] = updateNodeData.mock.calls[0];
		expect(patch.branchesOrder).toEqual(["a", patch.branchesOrder[1], "b"]);
		expect(patch.branches[patch.branchesOrder[1]].position).toBe(100);
	});

	it("adds a branch before the first one", () => {
		const nodeData = makeNodeData({
			branches: { a: { id: "a", position: 60 } },
			branchesOrder: ["a"],
		});
		const { result } = renderHook(() =>
			useBranchActions("node-1", nodeData, 200),
		);

		act(() => result.current.add(0));

		const [, patch] = updateNodeData.mock.calls[0];
		expect(patch.branchesOrder[0]).not.toBe("a");
		expect(patch.branches[patch.branchesOrder[0]].position).toBe(30);
	});

	it("adds a branch after the last one", () => {
		const nodeData = makeNodeData({
			branches: { a: { id: "a", position: 60 } },
			branchesOrder: ["a"],
		});
		const { result } = renderHook(() =>
			useBranchActions("node-1", nodeData, 200),
		);

		act(() => result.current.add(1));

		const [, patch] = updateNodeData.mock.calls[0];
		expect(patch.branchesOrder[1]).not.toBe("a");
		expect(patch.branches[patch.branchesOrder[1]].position).toBe(130);
	});

	it("aligns the new branch position to the grid", () => {
		const nodeData = makeNodeData({
			branches: {},
			branchesOrder: [],
		});
		const { result } = renderHook(() =>
			useBranchActions("node-1", nodeData, 205),
		);

		act(() => result.current.add(0));

		const [, patch] = updateNodeData.mock.calls[0];
		const newBranchId = patch.branchesOrder[0];
		expect(patch.branches[newBranchId].position % 10).toBe(0);
	});
});
