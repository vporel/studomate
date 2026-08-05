/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react"
import { useProjectStore } from "@/ui/components/projects/ProjectContext"
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum"
import { selectorImplementation } from "@tests/utils/store-mocks"
import useGrafcetMenuItems from "./useGrafcetMenuItems"

jest.mock("@/ui/components/projects/ProjectContext")
jest.mock("./ExplorerContextMenu", () => ({
	explorerContextMenuEventsOut: { emit: jest.fn(), on: jest.fn(), off: jest.fn() },
}))

import { explorerContextMenuEventsOut } from "./ExplorerContextMenu"

describe("useGrafcetMenuItems", () => {
	const grafcetsManager = {
		getGrafcet: jest.fn(),
		deleteGrafcet: jest.fn(),
	}
	const pagesManager = { openPage: jest.fn() }

	function setup(mode: ProjectMode) {
		;(useProjectStore as jest.Mock).mockImplementation(
			selectorImplementation({ grafcetsManager, pagesManager, mode }),
		)
		return renderHook(() => useGrafcetMenuItems())
	}

	afterEach(() => jest.clearAllMocks())

	it("opens the page for the given grafcet", () => {
		grafcetsManager.getGrafcet.mockReturnValue({ name: "Grafcet 1" })
		const { result } = setup(ProjectMode.DESIGN)

		act(() => result.current("g1")[0][0].onClick?.())

		expect(pagesManager.openPage).toHaveBeenCalledWith({
			id: "g1",
			type: "grafcet",
			title: "Grafcet 1",
		})
	})

	it("does not open a page when the grafcet no longer exists", () => {
		grafcetsManager.getGrafcet.mockReturnValue(undefined)
		const { result } = setup(ProjectMode.DESIGN)

		act(() => result.current("g1")[0][0].onClick?.())

		expect(pagesManager.openPage).not.toHaveBeenCalled()
	})

	it("enables rename and delete in design mode", () => {
		const { result } = setup(ProjectMode.DESIGN)
		const items = result.current("g1")
		expect(items[1][0].disabled).toBe(false)
		expect(items[1][1].disabled).toBe(false)
	})

	it("disables rename and delete outside design mode", () => {
		const { result } = setup(ProjectMode.SIMULATION)
		const items = result.current("g1")
		expect(items[1][0].disabled).toBe(true)
		expect(items[1][1].disabled).toBe(true)
	})

	it("emits a rename event", () => {
		const { result } = setup(ProjectMode.DESIGN)
		act(() => result.current("g1")[1][0].onClick?.())
		expect(explorerContextMenuEventsOut.emit).toHaveBeenCalledWith("grafcet-rename", { grafcetId: "g1" })
	})

	it("deletes the grafcet after confirmation", () => {
		const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true)
		const { result } = setup(ProjectMode.DESIGN)

		act(() => result.current("g1")[1][1].onClick?.())

		expect(grafcetsManager.deleteGrafcet).toHaveBeenCalledWith("g1")
		confirmSpy.mockRestore()
	})

	it("does not delete the grafcet when the user cancels", () => {
		const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false)
		const { result } = setup(ProjectMode.DESIGN)

		act(() => result.current("g1")[1][1].onClick?.())

		expect(grafcetsManager.deleteGrafcet).not.toHaveBeenCalled()
		confirmSpy.mockRestore()
	})
})
