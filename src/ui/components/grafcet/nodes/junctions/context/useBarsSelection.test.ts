/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react"
import useBarsSelection from "./useBarsSelection"

describe("useBarsSelection", () => {
	it("has nothing selected by default", () => {
		const { result } = renderHook(() => useBarsSelection(["a", "b", "c"]))
		expect(result.current.pivotSelected).toBe(false)
		expect(result.current.selectedBranchId).toBeNull()
	})

	it("selects the pivot", () => {
		const { result } = renderHook(() => useBarsSelection(["a", "b", "c"]))
		act(() => result.current.selectPivot())
		expect(result.current.pivotSelected).toBe(true)
		expect(result.current.selectedBranchId).toBeNull()
	})

	it("selects a branch, deselecting the pivot", () => {
		const { result } = renderHook(() => useBarsSelection(["a", "b", "c"]))
		act(() => result.current.selectPivot())
		act(() => result.current.selectBranch("b"))
		expect(result.current.pivotSelected).toBe(false)
		expect(result.current.selectedBranchId).toBe("b")
	})

	it("selects the previous branch", () => {
		const { result } = renderHook(() => useBarsSelection(["a", "b", "c"]))
		act(() => result.current.selectBranch("b"))
		act(() => result.current.selectPreviousBranch())
		expect(result.current.selectedBranchId).toBe("a")
	})

	it("does not move before the first branch", () => {
		const { result } = renderHook(() => useBarsSelection(["a", "b", "c"]))
		act(() => result.current.selectBranch("a"))
		act(() => result.current.selectPreviousBranch())
		expect(result.current.selectedBranchId).toBe("a")
	})

	it("selects the next branch", () => {
		const { result } = renderHook(() => useBarsSelection(["a", "b", "c"]))
		act(() => result.current.selectBranch("b"))
		act(() => result.current.selectNextBranch())
		expect(result.current.selectedBranchId).toBe("c")
	})

	it("does not move past the last branch", () => {
		const { result } = renderHook(() => useBarsSelection(["a", "b", "c"]))
		act(() => result.current.selectBranch("c"))
		act(() => result.current.selectNextBranch())
		expect(result.current.selectedBranchId).toBe("c")
	})

	it("clears the selection", () => {
		const { result } = renderHook(() => useBarsSelection(["a", "b", "c"]))
		act(() => result.current.selectBranch("b"))
		act(() => result.current.clearSelection())
		expect(result.current.pivotSelected).toBe(false)
		expect(result.current.selectedBranchId).toBeNull()
	})

	it("clears the selection when the user mousedowns elsewhere in the window", () => {
		const { result } = renderHook(() => useBarsSelection(["a", "b", "c"]))
		act(() => result.current.selectBranch("b"))

		act(() => {
			const event = new MouseEvent("mousedown", { buttons: 1 })
			window.dispatchEvent(event)
		})

		expect(result.current.selectedBranchId).toBeNull()
	})
})
