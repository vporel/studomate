/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react"
import { useReactFlow } from "@xyflow/react"
import { useGrafcetStore } from "@/ui/components/grafcet/context/GrafcetContext"
import { useGrafcetToolbarDnD } from "../toolbar/GrafcetToolbarDnDContext"
import { selectorImplementation } from "@tests/utils/store-mocks"
import useToolDragOverHandlers from "./useToolDragOverHandlers"

jest.mock("@/ui/components/grafcet/context/GrafcetContext")
jest.mock("../toolbar/GrafcetToolbarDnDContext", () => ({
	useGrafcetToolbarDnD: jest.fn(),
}))
jest.mock("@xyflow/react", () => ({
	useReactFlow: jest.fn(),
}))
jest.mock("./grafcet-nodes-definitions", () => ({
	NODES_DEFAULT_DIMENSIONS: { step: { width: 100, height: 60 } },
	NODES_DEFAULT_DATA_GENERATORS: { step: jest.fn((extraData) => ({ generated: true, extraData })) },
}))

function fakeDragEvent(pageX: number, pageY: number) {
	return {
		preventDefault: jest.fn(),
		dataTransfer: { dropEffect: "" },
		pageX,
		pageY,
	} as any
}

describe("useToolDragOverHandlers", () => {
	const addNodes = jest.fn()
	const workflowManager = { addNodes }
	const screenToFlowPosition = jest.fn(({ x, y }) => ({ x, y }))

	afterEach(() => jest.clearAllMocks())

	function setup(toolType: string | null, extraData: unknown = null) {
		;(useGrafcetStore as jest.Mock).mockImplementation(selectorImplementation({ workflowManager }))
		;(useGrafcetToolbarDnD as jest.Mock).mockReturnValue({ type: toolType, extraData })
		;(useReactFlow as jest.Mock).mockReturnValue({ screenToFlowPosition })
		return renderHook(() => useToolDragOverHandlers())
	}

	it("marks the drag-over as a move and prevents default", () => {
		const { result } = setup("step")
		const [handleToolDragOver] = result.current
		const event = fakeDragEvent(0, 0)

		act(() => handleToolDragOver(event))

		expect(event.preventDefault).toHaveBeenCalled()
		expect(event.dataTransfer.dropEffect).toBe("move")
	})

	it("adds a node centered on the drop position", () => {
		const { result } = setup("step", { some: "data" })
		const [, handleToolDrop] = result.current
		const event = fakeDragEvent(150, 130)

		act(() => handleToolDrop(event))

		expect(event.preventDefault).toHaveBeenCalled()
		expect(addNodes).toHaveBeenCalledTimes(1)
		const [nodes] = addNodes.mock.calls[0]
		const [node] = nodes
		expect(node).toMatchObject({
			type: "step",
			position: { x: 100, y: 100 },
			data: { generated: true, extraData: { some: "data" } },
		})
		expect(node.id).toEqual(expect.any(String))
	})

	it("does nothing when no tool is being dragged", () => {
		const { result } = setup(null)
		const [, handleToolDrop] = result.current

		act(() => handleToolDrop(fakeDragEvent(0, 0)))

		expect(addNodes).not.toHaveBeenCalled()
	})
})
