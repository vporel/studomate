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
	const cutSelectedElements = jest.fn()
	const pasteElements = jest.fn()
	const grafcetsManager = {
		getActiveStoreManagers: jest.fn(() => ({
			copyCutPasteManager: { copySelectedElements, cutSelectedElements, pasteElements },
		})),
		getActiveStoreValues: jest.fn(() => ({
			hasCommandsToUndo: true,
			hasCommandsToRedo: true,
		})),
	}
	const laddersManager = {
		getActiveStoreManagers: jest.fn(() => ({
			copyCutPasteManager: { copySelectedElements, cutSelectedElements, pasteElements },
		})),
		getActiveStoreValues: jest.fn(() => ({
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
		grafcetsManager.getActiveStoreValues.mockReturnValue({
			hasCommandsToUndo: overrides.hasCommandsToUndo ?? true,
			hasCommandsToRedo: overrides.hasCommandsToRedo ?? true,
		})
		const state = {
			activeScopeType: "grafcet",
			grafcetsManager,
			laddersManager,
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

	it("exposes undo, redo, copy, cut and paste", () => {
		const { result } = setup()
		expect(result.current.id).toBe("edit")
		expect(result.current.items[0].map((i) => i.label)).toEqual(["Annuler", "Rétablir"])
		expect(result.current.items[1].map((i) => i.label)).toEqual(["Copier", "Couper", "Coller"])
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

	it("disables copy/cut/paste when not editing a grafcet or a ladder", () => {
		const { result } = setup({ activeScopeType: "variables" })
		expect(result.current.items[1][0].disabled).toBe(true)
		expect(result.current.items[1][1].disabled).toBe(true)
		expect(result.current.items[1][2].disabled).toBe(true)
	})

	it("enables copy/cut/paste when editing a ladder", () => {
		const { result } = setup({ activeScopeType: "ladder" })
		expect(result.current.items[1][0].disabled).toBe(false)
		expect(result.current.items[1][1].disabled).toBe(false)
		expect(result.current.items[1][2].disabled).toBe(false)
	})

	it("disables copy/cut/paste outside design mode", () => {
		const { result } = setup({ mode: ProjectMode.SIMULATION })
		expect(result.current.items[1][0].disabled).toBe(true)
		expect(result.current.items[1][1].disabled).toBe(true)
		expect(result.current.items[1][2].disabled).toBe(true)
	})

	it("copies, cuts and pastes the selected elements of the active grafcet", () => {
		const { result } = setup()
		act(() => result.current.items[1][0].onClick?.())
		act(() => result.current.items[1][1].onClick?.())
		act(() => result.current.items[1][2].onClick?.())
		expect(copySelectedElements).toHaveBeenCalled()
		expect(cutSelectedElements).toHaveBeenCalled()
		expect(pasteElements).toHaveBeenCalled()
	})

	it("copies, cuts and pastes the selected elements of the active ladder", () => {
		const { result } = setup({ activeScopeType: "ladder" })
		act(() => result.current.items[1][0].onClick?.())
		act(() => result.current.items[1][1].onClick?.())
		act(() => result.current.items[1][2].onClick?.())
		expect(laddersManager.getActiveStoreManagers).toHaveBeenCalled()
		expect(copySelectedElements).toHaveBeenCalled()
		expect(cutSelectedElements).toHaveBeenCalled()
		expect(pasteElements).toHaveBeenCalled()
	})
})
