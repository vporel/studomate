/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react"
import useHelpMenu from "./useHelpMenu"

describe("useHelpMenu", () => {
	it("exposes the help menu structure", () => {
		const { result } = renderHook(() => useHelpMenu())
		expect(result.current.id).toBe("help")
		expect(result.current.items).toHaveLength(1)
		expect(result.current.items[0]).toHaveLength(1)
		expect(result.current.items[0][0].label).toBe("Manuel utilisateur")
	})

	it("opens the user manual in a new tab when clicked", () => {
		const openSpy = jest.spyOn(window, "open").mockImplementation(() => null)
		const { result } = renderHook(() => useHelpMenu())

		result.current.items[0][0].onClick?.()

		expect(openSpy).toHaveBeenCalledWith("/manuel-utilisateur", "_blank", "noopener,noreferrer")
		openSpy.mockRestore()
	})
})
