/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react"
import { useProjectStore } from "@/ui/components/projects/ProjectContext"
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum"
import { selectorImplementation } from "@tests/utils/store-mocks"
import useHmiFolderMenuItems from "./useHmiFolderMenuItems"

jest.mock("@/ui/components/projects/ProjectContext")

describe("useHmiFolderMenuItems", () => {
	const hmiManager = { newHmiPage: jest.fn() }

	function setup(mode: ProjectMode = ProjectMode.DESIGN) {
		;(useProjectStore as jest.Mock).mockImplementation(
			selectorImplementation({ hmiManager, mode }),
		)
		return renderHook(() => useHmiFolderMenuItems())
	}

	afterEach(() => jest.clearAllMocks())

	it("expose un item 'Nouvelle page HMI' en mode édition", () => {
		const { result } = setup(ProjectMode.DESIGN)
		const items = result.current()

		expect(items[0][0].label).toBe("Nouvelle page HMI")
		expect(items[0][0].disabled).toBe(false)
	})

	it("désactive 'Nouvelle page HMI' en mode simulation", () => {
		const { result } = setup(ProjectMode.SIMULATION)
		const items = result.current()

		expect(items[0][0].disabled).toBe(true)
	})

	it("appelle hmiManager.newHmiPage au clic", () => {
		const { result } = setup()

		act(() => result.current()[0][0].onClick?.())

		expect(hmiManager.newHmiPage).toHaveBeenCalledTimes(1)
	})
})
