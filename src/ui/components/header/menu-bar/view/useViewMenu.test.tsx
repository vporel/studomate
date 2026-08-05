/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react"
import { AppContextProvider } from "@/ui/components/AppContext"
import useViewMenu from "./useViewMenu"

describe("useViewMenu", () => {
	it("exposes the explorer toggle, checked when the explorer is visible", () => {
		const { result } = renderHook(() => useViewMenu(), { wrapper: AppContextProvider })
		expect(result.current.id).toBe("view")
		expect(result.current.items[0][0].label).toBe("Explorateur")
		expect(result.current.items[0][0].checked).toBe(true)
	})

	it("toggles the explorer visibility when clicked", () => {
		const { result } = renderHook(() => useViewMenu(), { wrapper: AppContextProvider })

		act(() => result.current.items[0][0].onClick?.())
		expect(result.current.items[0][0].checked).toBe(false)

		act(() => result.current.items[0][0].onClick?.())
		expect(result.current.items[0][0].checked).toBe(true)
	})
})
