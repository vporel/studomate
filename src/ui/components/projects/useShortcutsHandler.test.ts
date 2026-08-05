/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react"
import { useProjectContext, useProjectStore } from "@/ui/components/projects/ProjectContext"
import { getLastMousePosition } from "@/ui/lib/mouse-position"
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum"
import { fakeStoreApi, selectorImplementation } from "@tests/utils/store-mocks"
import useShortcutsHandler from "./useShortcutsHandler"

jest.mock("@/ui/components/projects/ProjectContext")
jest.mock("@/ui/lib/mouse-position")

function dispatchShortcut(key: string, target: Element = document.body) {
	const event = new KeyboardEvent("keydown", { key, ctrlKey: true, bubbles: true, cancelable: true })
	target.dispatchEvent(event)
}

describe("useShortcutsHandler", () => {
	const setOpenModalVisible = jest.fn()
	const saveProject = jest.fn()
	const newGrafcet = jest.fn()
	const undoActiveScope = jest.fn()
	const redoActiveScope = jest.fn()
	const selectAllNodesAndEdges = jest.fn()
	const copySelectedElements = jest.fn()
	const pasteElements = jest.fn()

	function setup(mode: ProjectMode, activeScopeType: "grafcet" | "variables" = "grafcet") {
		const grafcetsManager = {
			newGrafcet,
			getActiveGrafcetStoreManagers: jest.fn(() => ({
				viewManager: { selectAllNodesAndEdges },
				copyCutPasteManager: { copySelectedElements, pasteElements },
			})),
		}
		const state = {
			mode,
			activeScopeType,
			grafcetsManager,
			undoActiveScope,
			redoActiveScope,
		}
		;(useProjectStore as jest.Mock).mockImplementation(
			selectorImplementation({ grafcetsManager, setOpenModalVisible, saveProject }),
		)
		;(useProjectContext as jest.Mock).mockReturnValue(fakeStoreApi(state))
		;(getLastMousePosition as jest.Mock).mockReturnValue({ x: 1, y: 2 })
		return renderHook(() => useShortcutsHandler())
	}

	afterEach(() => jest.clearAllMocks())

	it("opens the open-project modal on Ctrl+O while designing", () => {
		setup(ProjectMode.DESIGN)
		dispatchShortcut("o")
		expect(setOpenModalVisible).toHaveBeenCalledWith(true)
	})

	it("ignores Ctrl+O outside design mode", () => {
		setup(ProjectMode.SIMULATION)
		dispatchShortcut("o")
		expect(setOpenModalVisible).not.toHaveBeenCalled()
	})

	it("saves the project on Ctrl+S regardless of mode", () => {
		setup(ProjectMode.SIMULATION)
		dispatchShortcut("s")
		expect(saveProject).toHaveBeenCalled()
	})

	it("creates a new grafcet on Ctrl+G while designing", () => {
		setup(ProjectMode.DESIGN)
		dispatchShortcut("g")
		expect(newGrafcet).toHaveBeenCalled()
	})

	it("selects all nodes on Ctrl+A while designing a grafcet", () => {
		setup(ProjectMode.DESIGN, "grafcet")
		dispatchShortcut("a")
		expect(selectAllNodesAndEdges).toHaveBeenCalled()
	})

	it("does not select nodes on Ctrl+A outside a grafcet scope", () => {
		setup(ProjectMode.DESIGN, "variables")
		dispatchShortcut("a")
		expect(selectAllNodesAndEdges).not.toHaveBeenCalled()
	})

	it("undoes and redoes regardless of mode", () => {
		setup(ProjectMode.SIMULATION)
		dispatchShortcut("z")
		dispatchShortcut("y")
		expect(undoActiveScope).toHaveBeenCalled()
		expect(redoActiveScope).toHaveBeenCalled()
	})

	it("copies and pastes selected elements while designing a grafcet", () => {
		setup(ProjectMode.DESIGN, "grafcet")
		dispatchShortcut("c")
		dispatchShortcut("v")
		expect(copySelectedElements).toHaveBeenCalled()
		expect(pasteElements).toHaveBeenCalledWith({ x: 1, y: 2 })
	})

	it("ignores shortcuts typed inside an input", () => {
		setup(ProjectMode.DESIGN)
		const input = document.createElement("input")
		document.body.appendChild(input)
		dispatchShortcut("s", input)
		expect(saveProject).not.toHaveBeenCalled()
		document.body.removeChild(input)
	})
})
