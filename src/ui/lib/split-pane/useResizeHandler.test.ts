/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react"
import { MouseEvent as ReactMouseEvent, ReactElement, RefObject } from "react"
import useResizeHandler from "./useResizeHandler"
import { PaneProps } from "./split-pane"

function fakePane(props: Partial<PaneProps>): ReactElement<PaneProps> {
	return { props } as ReactElement<PaneProps>
}

function createRef(rect: Partial<DOMRect>): RefObject<HTMLDivElement | null> {
	const div = document.createElement("div")
	div.getBoundingClientRect = () => rect as DOMRect
	return { current: div }
}

function fakeMouseDownEvent(clientX: number, clientY: number): ReactMouseEvent<HTMLDivElement> {
	return { clientX, clientY, preventDefault: jest.fn() } as unknown as ReactMouseEvent<HTMLDivElement>
}

describe("useResizeHandler", () => {
	it("resizes the adjacent panes proportionally to the horizontal drag distance", () => {
		const ref = createRef({ width: 1000, height: 1000 })
		const children = [fakePane({}), fakePane({})]
		const setSizes = jest.fn()
		const { result } = renderHook(() => useResizeHandler(ref, true, [50, 50], setSizes, children))

		act(() => {
			result.current(0, fakeMouseDownEvent(100, 0))
		})
		act(() => {
			document.dispatchEvent(new MouseEvent("mousemove", { clientX: 200, clientY: 0 }))
		})

		expect(setSizes).toHaveBeenCalledWith([60, 40])
	})

	it("does not resize below the left pane's minimum size", () => {
		const ref = createRef({ width: 1000, height: 1000 })
		const children = [fakePane({ minSize: "45%" }), fakePane({})]
		const setSizes = jest.fn()
		const { result } = renderHook(() => useResizeHandler(ref, true, [50, 50], setSizes, children))

		act(() => {
			result.current(0, fakeMouseDownEvent(100, 0))
		})
		act(() => {
			document.dispatchEvent(new MouseEvent("mousemove", { clientX: 0, clientY: 0 }))
		})

		expect(setSizes).not.toHaveBeenCalled()
	})

	it("does not resize beyond the right pane's maximum size", () => {
		const ref = createRef({ width: 1000, height: 1000 })
		const children = [fakePane({}), fakePane({ maxSize: "55%" })]
		const setSizes = jest.fn()
		const { result } = renderHook(() => useResizeHandler(ref, true, [50, 50], setSizes, children))

		act(() => {
			result.current(0, fakeMouseDownEvent(100, 0))
		})
		act(() => {
			document.dispatchEvent(new MouseEvent("mousemove", { clientX: 0, clientY: 0 }))
		})

		expect(setSizes).not.toHaveBeenCalled()
	})

	it("stops listening for mouse movement after mouseup", () => {
		const ref = createRef({ width: 1000, height: 1000 })
		const children = [fakePane({}), fakePane({})]
		const setSizes = jest.fn()
		const { result } = renderHook(() => useResizeHandler(ref, true, [50, 50], setSizes, children))

		act(() => {
			result.current(0, fakeMouseDownEvent(100, 0))
		})
		act(() => {
			document.dispatchEvent(new MouseEvent("mouseup"))
		})
		setSizes.mockClear()
		act(() => {
			document.dispatchEvent(new MouseEvent("mousemove", { clientX: 300, clientY: 0 }))
		})

		expect(setSizes).not.toHaveBeenCalled()
	})

	it("stops listening for mouse movement after unmount mid-drag", () => {
		const ref = createRef({ width: 1000, height: 1000 })
		const children = [fakePane({}), fakePane({})]
		const setSizes = jest.fn()
		const { result, unmount } = renderHook(() => useResizeHandler(ref, true, [50, 50], setSizes, children))

		act(() => {
			result.current(0, fakeMouseDownEvent(100, 0))
		})
		unmount()
		act(() => {
			document.dispatchEvent(new MouseEvent("mousemove", { clientX: 300, clientY: 0 }))
		})

		expect(setSizes).not.toHaveBeenCalled()
	})

	it("uses vertical mouse movement when split horizontally", () => {
		const ref = createRef({ width: 1000, height: 1000 })
		const children = [fakePane({}), fakePane({})]
		const setSizes = jest.fn()
		const { result } = renderHook(() => useResizeHandler(ref, false, [50, 50], setSizes, children))

		act(() => {
			result.current(0, fakeMouseDownEvent(0, 100))
		})
		act(() => {
			document.dispatchEvent(new MouseEvent("mousemove", { clientX: 0, clientY: 150 }))
		})

		expect(setSizes).toHaveBeenCalledWith([55, 45])
	})
})
