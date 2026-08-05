/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react"
import { AppContextProvider, useAppContext } from "@/ui/components/AppContext"
import usePaneMenuItems from "./usePaneMenuItems"

function useHarness() {
	const getItems = usePaneMenuItems()
	const { viewAppearance } = useAppContext()
	return { items: getItems(), viewAppearance }
}

describe("usePaneMenuItems", () => {
	it("returns a menu item to hide the explorer", () => {
		const { result } = renderHook(() => useHarness(), { wrapper: AppContextProvider })
		expect(result.current.items).toHaveLength(1)
		expect(result.current.items[0]).toHaveLength(1)
		expect(result.current.items[0][0].label).toBe("Masquer l'explorateur")
	})

	it("hides the explorer when clicked", () => {
		const { result } = renderHook(() => useHarness(), { wrapper: AppContextProvider })

		expect(result.current.viewAppearance.explorer).toBe(true)

		act(() => result.current.items[0][0].onClick?.())

		expect(result.current.viewAppearance.explorer).toBe(false)
	})
})
