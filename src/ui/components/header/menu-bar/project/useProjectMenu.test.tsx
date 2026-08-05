/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react"
import { useProjectStore } from "@/ui/components/projects/ProjectContext"
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum"
import { selectorImplementation } from "@tests/utils/store-mocks"
import useProjectMenu from "./useProjectMenu"

jest.mock("@/ui/components/projects/ProjectContext")
jest.mock("@/ui/components/pages/ProjectPropertiesPage", () => ({
	PROJECT_PROPERTIES_PAGE_DATA: { id: "project-properties", type: "project-properties", title: "Propriétés" },
}))

describe("useProjectMenu", () => {
	const grafcetsManager = { newGrafcet: jest.fn() }
	const pagesManager = { openPage: jest.fn() }

	function setup(mode: ProjectMode) {
		;(useProjectStore as jest.Mock).mockImplementation(
			selectorImplementation({ grafcetsManager, pagesManager, mode }),
		)
		return renderHook(() => useProjectMenu())
	}

	afterEach(() => jest.clearAllMocks())

	it("exposes the project menu groups", () => {
		const { result } = setup(ProjectMode.DESIGN)
		expect(result.current.id).toBe("project")
		expect(result.current.items[0][0].label).toBe("Nouveau grafcet")
		expect(result.current.items[1][0].label).toBe("Propriétés")
	})

	it("creates a new grafcet when designing", () => {
		const { result } = setup(ProjectMode.DESIGN)
		act(() => result.current.items[0][0].onClick?.())
		expect(grafcetsManager.newGrafcet).toHaveBeenCalled()
	})

	it("disables and ignores new grafcet outside design mode", () => {
		const { result } = setup(ProjectMode.SIMULATION)
		expect(result.current.items[0][0].disabled).toBe(true)

		act(() => result.current.items[0][0].onClick?.())
		expect(grafcetsManager.newGrafcet).not.toHaveBeenCalled()
	})

	it("opens the project properties page regardless of mode", () => {
		const { result } = setup(ProjectMode.SIMULATION)
		act(() => result.current.items[1][0].onClick?.())
		expect(pagesManager.openPage).toHaveBeenCalledWith({
			id: "project-properties",
			type: "project-properties",
			title: "Propriétés",
		})
	})
})
