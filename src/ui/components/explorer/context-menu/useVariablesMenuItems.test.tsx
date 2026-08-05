/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react"
import { useProjectStore } from "@/ui/components/projects/ProjectContext"
import { selectorImplementation } from "@tests/utils/store-mocks"
import useVariablesMenuItems from "./useVariablesMenuItems"

jest.mock("@/ui/components/projects/ProjectContext")
jest.mock("@/ui/components/pages/VariablesPage", () => ({
	getVariablesPageData: jest.fn((id: string) => ({ id, type: "variables", title: id })),
}))

import { getVariablesPageData } from "@/ui/components/pages/VariablesPage"

describe("useVariablesMenuItems", () => {
	const pagesManager = { openPage: jest.fn() }

	beforeEach(() => {
		;(useProjectStore as jest.Mock).mockImplementation(selectorImplementation({ pagesManager }))
	})

	afterEach(() => jest.clearAllMocks())

	it("returns a single group with an open action", () => {
		const { result } = renderHook(() => useVariablesMenuItems())
		const items = result.current("input-variables")
		expect(items).toHaveLength(1)
		expect(items[0]).toHaveLength(1)
		expect(items[0][0].label).toBe("Ouvrir")
	})

	it("opens the requested variables page", () => {
		const { result } = renderHook(() => useVariablesMenuItems())

		act(() => result.current("output-variables")[0][0].onClick?.())

		expect(getVariablesPageData).toHaveBeenCalledWith("output-variables")
		expect(pagesManager.openPage).toHaveBeenCalledWith({
			id: "output-variables",
			type: "variables",
			title: "output-variables",
		})
	})
})
