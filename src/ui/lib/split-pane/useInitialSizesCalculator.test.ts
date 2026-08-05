/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react"
import { ReactElement, RefObject } from "react"
import useInitialSizesCalculator, { parseSize } from "./useInitialSizesCalculator"
import { PaneProps } from "./split-pane"

function fakePane(props: Partial<PaneProps>): ReactElement<PaneProps> {
	return { props } as ReactElement<PaneProps>
}

function createRef(rect: Partial<DOMRect>): RefObject<HTMLDivElement | null> {
	const div = document.createElement("div")
	div.getBoundingClientRect = () => rect as DOMRect
	return { current: div }
}

describe("parseSize", () => {
	it("converts a percentage string to a number", () => {
		expect(parseSize("40%", 1000)).toBe(40)
	})

	it("converts a pixel string relative to the container size", () => {
		expect(parseSize("100px", 1000)).toBe(10)
	})

	it("converts a plain number as pixels relative to the container size", () => {
		expect(parseSize(250, 1000)).toBe(25)
	})

	it("returns 0 for unrecognized values", () => {
		expect(parseSize("auto", 1000)).toBe(0)
	})
})

describe("useInitialSizesCalculator", () => {
	it("does nothing when the container has no bounding rect", () => {
		const ref: RefObject<HTMLDivElement | null> = { current: null }
		const children = [fakePane({ initialSize: "50%" })]
		const setSizes = jest.fn()

		renderHook(() => useInitialSizesCalculator(ref, children, true, setSizes))

		expect(setSizes).not.toHaveBeenCalled()
	})

	it("distributes remaining space evenly across panes without an initial size", () => {
		const ref = createRef({ width: 1000, height: 1000 })
		const children = [fakePane({ initialSize: "40%" }), fakePane({}), fakePane({})]
		const setSizes = jest.fn()

		renderHook(() => useInitialSizesCalculator(ref, children, true, setSizes))

		expect(setSizes).toHaveBeenCalledWith([40, 30, 30])
	})

	it("uses the container height when split horizontally", () => {
		const ref = createRef({ width: 1000, height: 500 })
		const children = [fakePane({ initialSize: "100px" })]
		const setSizes = jest.fn()

		renderHook(() => useInitialSizesCalculator(ref, children, false, setSizes))

		expect(setSizes).toHaveBeenCalledWith([20])
	})
})
