/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react"
import { useProjectStore } from "@/ui/components/projects/ProjectContext"
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum"
import { selectorImplementation } from "@tests/utils/store-mocks"
import useEditMenu from "./useEditMenu"

jest.mock("@/ui/components/projects/ProjectContext")

describe("useEditMenu", () => {
	const undo = jest.fn()
	const redo = jest.fn()
	const copySelectedElements = jest.fn()
	const pasteElements = jest.fn()
	const grafcetsManager = {
		getActiveGrafcetStoreManagers: jest.fn(() => ({
			copyCutPasteManager: { copySelectedElements, pasteElements },
		})),
		getActiveGrafcetStoreValues: jest.fn(() => ({
			hasCommandsToUndo: true,
			hasCommandsToRedo: true,
		})),
	}

	function setup(
		overrides: Partial<{
			activeScopeType: string
			mode: ProjectMode
			hasCommandsToUndo: boolean
			hasCommandsToRedo: boolean
		}> = {},
	) {
		grafcetsManager.getActiveGrafcetStoreValues.mockReturnValue({
			hasCommandsToUndo: overrides.hasCommandsToUndo ?? true,
			hasCommandsToRedo: overrides.hasCommandsToRedo ?? true,
		})
		const state = {
			activeScopeType: "grafcet",
			grafcetsManager,
			mode: ProjectMode.DESIGN,
			hasCommandsToUndo: true,
			hasCommandsToRedo: true,
			undoActiveScope: undo,
			redoActiveScope: redo,
			...overrides,
		}
		;(useProjectStore as jest.Mock).mockImplementation(selectorImplementation(state))
		return renderHook(() => useEditMenu())
	}

	afterEach(() => jest.clearAllMocks())

	it("exposes undo, redo, copy and paste", () => {
		const { result } = setup()
		expect(result.current.id).toBe("edit")
		expect(result.current.items[0].map((i) => i.label)).toEqual(["Annuler", "Rétablir"])
		expect(result.current.items[1].map((i) => i.label)).toEqual(["Copier", "Coller"])
	})

	it("disables undo/redo based on the active scope history", () => {
		const { result } = setup({ hasCommandsToUndo: false, hasCommandsToRedo: false })
		expect(result.current.items[0][0].disabled).toBe(true)
		expect(result.current.items[0][1].disabled).toBe(true)
	})

	it("triggers undo and redo", () => {
		const { result } = setup()
		act(() => result.current.items[0][0].onClick?.())
		act(() => result.current.items[0][1].onClick?.())
		expect(undo).toHaveBeenCalled()
		expect(redo).toHaveBeenCalled()
	})

	it("disables copy/paste when not editing a grafcet", () => {
		const { result } = setup({ activeScopeType: "variables" })
		expect(result.current.items[1][0].disabled).toBe(true)
		expect(result.current.items[1][1].disabled).toBe(true)
	})

	it("disables copy/paste outside design mode", () => {
		const { result } = setup({ mode: ProjectMode.SIMULATION })
		expect(result.current.items[1][0].disabled).toBe(true)
		expect(result.current.items[1][1].disabled).toBe(true)
	})

	it("copies and pastes the selected elements", () => {
		const { result } = setup()
		act(() => result.current.items[1][0].onClick?.())
		act(() => result.current.items[1][1].onClick?.())
		expect(copySelectedElements).toHaveBeenCalled()
		expect(pasteElements).toHaveBeenCalled()
	})
})
