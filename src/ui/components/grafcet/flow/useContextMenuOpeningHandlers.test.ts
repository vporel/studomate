/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react"
import { useReactFlow } from "@xyflow/react"
import { useGrafcetContext } from "../context/GrafcetContext"
import useContextMenuOpeningHandlers from "./useContextMenuOpeningHandlers"

jest.mock("../context/GrafcetContext")
jest.mock("@xyflow/react", () => ({
	useReactFlow: jest.fn(),
}))

function fakeMouseEvent(pageX: number, pageY: number) {
	return { preventDefault: jest.fn(), pageX, pageY } as any
}

describe("useContextMenuOpeningHandlers", () => {
	const emit = jest.fn()
	const screenToFlowPosition = jest.fn(({ x, y }) => ({ x: x + 1, y: y + 1 }))

	beforeEach(() => {
		;(useGrafcetContext as jest.Mock).mockReturnValue({ contextMenuEvents: { emit } })
		;(useReactFlow as jest.Mock).mockReturnValue({ screenToFlowPosition })
	})

	afterEach(() => jest.clearAllMocks())

	it("emits a show event for the pane", () => {
		const { result } = renderHook(() => useContextMenuOpeningHandlers())
		const event = fakeMouseEvent(10, 20)

		act(() => result.current.onPaneContextMenu(event))

		expect(event.preventDefault).toHaveBeenCalled()
		expect(emit).toHaveBeenCalledWith("show", {
			element: { type: "pane" },
			position: { x: 11, y: 21 },
		})
	})

	it("emits a show event for a node", () => {
		const { result } = renderHook(() => useContextMenuOpeningHandlers())
		const node = { id: "n1" }

		act(() => result.current.onNodeContextMenu(fakeMouseEvent(5, 5), node))

		expect(emit).toHaveBeenCalledWith("show", { element: node, position: { x: 6, y: 6 } })
	})

	it("emits a show event for an edge", () => {
		const { result } = renderHook(() => useContextMenuOpeningHandlers())
		const edge = { id: "e1" }

		act(() => result.current.onEdgeContextMenu(fakeMouseEvent(5, 5), edge))

		expect(emit).toHaveBeenCalledWith("show", { element: edge, position: { x: 6, y: 6 } })
	})
})
