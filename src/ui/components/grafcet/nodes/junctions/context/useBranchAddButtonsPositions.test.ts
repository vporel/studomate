/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react"
import { JunctionData } from "@/schemas/grafcet/junction.schema"

jest.mock("../JunctionNodeBranchAddButtons", () => ({
	JUNCTION_NODE_BRANCH_ADD_BUTTON_WIDTH: 20,
}))

import useBranchAddButtonsPositions from "./useBranchAddButtonsPositions"

function makeNodeData(overrides: Partial<JunctionData>): JunctionData {
	return {
		width: 200,
		pivotPosition: 100,
		branches: {},
		branchesOrder: [],
		...overrides,
	} as JunctionData
}

describe("useBranchAddButtonsPositions", () => {
	it("returns a single centered position when there are no branches", () => {
		const nodeData = makeNodeData({ width: 200 })
		const { result } = renderHook(() => useBranchAddButtonsPositions(nodeData))
		expect(result.current).toEqual([100])
	})

	it("returns a position before, between and after existing branches", () => {
		const nodeData = makeNodeData({
			width: 200,
			branches: {
				a: { id: "a", position: 60 },
				b: { id: "b", position: 140 },
			},
			branchesOrder: ["a", "b"],
		})
		const { result } = renderHook(() => useBranchAddButtonsPositions(nodeData))
		expect(result.current).toEqual([30, 100, 170])
	})

	it("offsets the leading button outside the node when the first branch is close to the edge", () => {
		const nodeData = makeNodeData({
			width: 200,
			branches: { a: { id: "a", position: 10 } },
			branchesOrder: ["a"],
		})
		const { result } = renderHook(() => useBranchAddButtonsPositions(nodeData))
		expect(result.current[0]).toBe(-10)
	})

	it("offsets the trailing button outside the node when the last branch is close to the edge", () => {
		const nodeData = makeNodeData({
			width: 200,
			branches: { a: { id: "a", position: 195 } },
			branchesOrder: ["a"],
		})
		const { result } = renderHook(() => useBranchAddButtonsPositions(nodeData))
		expect(result.current[1]).toBe(210)
	})
})
