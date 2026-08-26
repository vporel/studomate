/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react"
import { useUpdateNodeInternals } from "@xyflow/react"
import { useGrafcetStore } from "@/ui/components/grafcet/context/GrafcetContext"
import { JunctionData } from "@/schemas/grafcet/junction.schema"
import { selectorImplementation } from "@tests/utils/store-mocks"
import useKeyboardEventsHandler from "./useKeyboardEventsHandler"

jest.mock("@/ui/components/grafcet/context/GrafcetContext")
jest.mock("@xyflow/react", () => ({
	useUpdateNodeInternals: jest.fn(),
}))

function fakeKeyboardEvent(key: string, overrides: Partial<Record<string, unknown>> = {}) {
	return {
		key,
		ctrlKey: false,
		metaKey: false,
		shiftKey: false,
		preventDefault: jest.fn(),
		stopPropagation: jest.fn(),
		...overrides,
	} as any
}

describe("useKeyboardEventsHandler", () => {
	const updateNodeData = jest.fn()
	const deleteJunctionBranch = jest.fn()
	const workflowManager = { updateNodeData, deleteJunctionBranch }
	const updateNodeInternals = jest.fn()
	const selectPreviousBranch = jest.fn()
	const selectNextBranch = jest.fn()
	const clearSelection = jest.fn()

	beforeEach(() => {
		;(useGrafcetStore as jest.Mock).mockImplementation(selectorImplementation({ workflowManager }))
		;(useUpdateNodeInternals as jest.Mock).mockReturnValue(updateNodeInternals)
	})

	afterEach(() => jest.clearAllMocks())

	function setup(pivotSelected: boolean, selectedBranchId: string | null, width = 200) {
		const { result } = renderHook(() =>
			useKeyboardEventsHandler(
				"node-1",
				pivotSelected,
				selectedBranchId,
				selectPreviousBranch,
				selectNextBranch,
				clearSelection,
				width,
			),
		)
		return result.current
	}

	it("does nothing when nothing is selected", () => {
		const handler = setup(false, null)
		const event = fakeKeyboardEvent("Escape")

		act(() => handler(event))

		expect(clearSelection).not.toHaveBeenCalled()
		expect(event.preventDefault).not.toHaveBeenCalled()
	})

	it("clears the selection on Escape", () => {
		const handler = setup(true, null)
		const event = fakeKeyboardEvent("Escape")

		act(() => handler(event))

		expect(event.preventDefault).toHaveBeenCalled()
		expect(clearSelection).toHaveBeenCalled()
	})

	it("deletes the selected branch on Ctrl+Delete", () => {
		const handler = setup(false, "b1")
		const event = fakeKeyboardEvent("Delete", { ctrlKey: true })

		act(() => handler(event))

		expect(deleteJunctionBranch).toHaveBeenCalledWith("node-1", "b1")
	})

	it("does not delete when the pivot is selected", () => {
		const handler = setup(true, null)
		const event = fakeKeyboardEvent("Backspace", { ctrlKey: true })

		act(() => handler(event))

		expect(deleteJunctionBranch).not.toHaveBeenCalled()
	})

	it("selects the previous/next branch on Shift+Arrow without touching the store", () => {
		const handler = setup(false, "b1")

		act(() => handler(fakeKeyboardEvent("ArrowLeft", { shiftKey: true })))
		expect(selectPreviousBranch).toHaveBeenCalled()

		act(() => handler(fakeKeyboardEvent("ArrowRight", { shiftKey: true })))
		expect(selectNextBranch).toHaveBeenCalled()

		expect(updateNodeData).not.toHaveBeenCalled()
	})

	it("moves the pivot left within the grid bounds", () => {
		const handler = setup(true, null)
		const event = fakeKeyboardEvent("ArrowLeft")

		act(() => handler(event))

		expect(updateNodeData).toHaveBeenCalledWith("node-1", expect.any(Function))
		const updater = updateNodeData.mock.calls[0][1]
		const prevData: JunctionData = {
			pivotPosition: 100,
			branches: {},
			branchesOrder: [],
		} as JunctionData
		expect(updater(prevData)).toEqual({ pivotPosition: 90 })
		expect(updateNodeInternals).toHaveBeenCalledWith("node-1")
	})

	it("does not move the pivot past the left grid boundary", () => {
		const handler = setup(true, null)
		act(() => handler(fakeKeyboardEvent("ArrowLeft")))
		const updater = updateNodeData.mock.calls[0][1]
		const prevData: JunctionData = {
			pivotPosition: 10,
			branches: {},
			branchesOrder: [],
		} as JunctionData
		expect(updater(prevData)).toEqual({})
	})

	it("moves the selected branch, avoiding overlap with other branches", () => {
		const handler = setup(false, "b1")
		act(() => handler(fakeKeyboardEvent("ArrowRight")))
		const updater = updateNodeData.mock.calls[0][1]
		const prevData: JunctionData = {
			pivotPosition: 100,
			branches: { b1: { id: "b1", position: 50 }, b2: { id: "b2", position: 60 } },
			branchesOrder: ["b1", "b2"],
		} as JunctionData

		expect(updater(prevData)).toEqual({})
	})
})
