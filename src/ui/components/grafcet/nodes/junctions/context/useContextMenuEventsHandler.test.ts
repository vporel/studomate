/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react"
import mitt from "mitt"
import { useGrafcetContext } from "@/ui/components/grafcet/context/GrafcetContext"
import { GrafcetContextMenuEvents } from "@/ui/components/grafcet/context/context-menu-events"
import useContextMenuEventsHandler from "./useContextMenuEventsHandler"

jest.mock("@/ui/components/grafcet/context/GrafcetContext")

describe("useContextMenuEventsHandler", () => {
	const selectPivot = jest.fn()
	const selectBranch = jest.fn()

	function setup(nodeId: string) {
		const contextMenuEvents = mitt<GrafcetContextMenuEvents>()
		;(useGrafcetContext as jest.Mock).mockReturnValue({ contextMenuEvents })
		renderHook(() => useContextMenuEventsHandler(nodeId, selectPivot, selectBranch))
		return contextMenuEvents
	}

	afterEach(() => jest.clearAllMocks())

	it("selects the pivot when the node matches", () => {
		const contextMenuEvents = setup("node-1")

		contextMenuEvents.emit("node-action", { nodeId: "node-1", type: "junction-select-pivot" })

		expect(selectPivot).toHaveBeenCalled()
	})

	it("selects a branch when the node matches", () => {
		const contextMenuEvents = setup("node-1")

		contextMenuEvents.emit("node-action", {
			nodeId: "node-1",
			type: "junction-select-branch",
			branchId: "b1",
		})

		expect(selectBranch).toHaveBeenCalledWith("b1")
	})

	it("ignores actions targeting a different node", () => {
		const contextMenuEvents = setup("node-1")

		contextMenuEvents.emit("node-action", { nodeId: "node-2", type: "junction-select-pivot" })

		expect(selectPivot).not.toHaveBeenCalled()
	})

	it("unsubscribes on unmount", () => {
		const contextMenuEvents = mitt<GrafcetContextMenuEvents>()
		;(useGrafcetContext as jest.Mock).mockReturnValue({ contextMenuEvents })
		const { unmount } = renderHook(() => useContextMenuEventsHandler("node-1", selectPivot, selectBranch))

		unmount()
		contextMenuEvents.emit("node-action", { nodeId: "node-1", type: "junction-select-pivot" })

		expect(selectPivot).not.toHaveBeenCalled()
	})
})
