/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { ReactElement, RefObject } from "react";
import useInitialSizesCalculator, {
	parseSize,
} from "./useInitialSizesCalculator";
import { PaneProps } from "./split-pane";

function fakePane(props: Partial<PaneProps>): ReactElement<PaneProps> {
	return { props } as ReactElement<PaneProps>;
}

function createRef(rect: Partial<DOMRect>): RefObject<HTMLDivElement | null> {
	const div = document.createElement("div");
	div.getBoundingClientRect = () => rect as DOMRect;
	return { current: div };
}

describe("parseSize", () => {
	it("converts a percentage string to a number", () => {
		expect(parseSize("40%", 1000)).toBe(40);
	});

	it("converts a pixel string relative to the container size", () => {
		expect(parseSize("100px", 1000)).toBe(10);
	});

	it("converts a plain number as pixels relative to the container size", () => {
		expect(parseSize(250, 1000)).toBe(25);
	});

	it("returns 0 for unrecognized values", () => {
		expect(parseSize("auto", 1000)).toBe(0);
	});
});

describe("useInitialSizesCalculator", () => {
	it("does nothing when the container has no bounding rect", () => {
		const ref: RefObject<HTMLDivElement | null> = { current: null };
		const children = [fakePane({ initialSize: "50%" })];
		const setSizes = jest.fn();

		renderHook(() => useInitialSizesCalculator(ref, children, true, setSizes));

		expect(setSizes).not.toHaveBeenCalled();
	});

	it("distributes remaining space evenly across panes without an initial size", () => {
		const ref = createRef({ width: 1000, height: 1000 });
		const children = [
			fakePane({ initialSize: "40%" }),
			fakePane({}),
			fakePane({}),
		];
		const setSizes = jest.fn();

		renderHook(() => useInitialSizesCalculator(ref, children, true, setSizes));

		expect(setSizes).toHaveBeenCalledWith([40, 30, 30]);
	});

	it("uses the container height when split horizontally", () => {
		const ref = createRef({ width: 1000, height: 500 });
		const children = [fakePane({ initialSize: "100px" })];
		const setSizes = jest.fn();

		renderHook(() => useInitialSizesCalculator(ref, children, false, setSizes));

		expect(setSizes).toHaveBeenCalledWith([20]);
	});
});

describe("useInitialSizesCalculator recomputation", () => {
	let resizeCallbacks: (() => void)[];
	const originalResizeObserver = globalThis.ResizeObserver;

	beforeEach(() => {
		resizeCallbacks = [];
		globalThis.ResizeObserver = class {
			constructor(callback: () => void) {
				resizeCallbacks.push(callback);
			}
			observe() {}
			unobserve() {}
			disconnect() {}
		} as unknown as typeof ResizeObserver;
	});

	afterEach(() => {
		globalThis.ResizeObserver = originalResizeObserver;
	});

	function createResizableRef(width: number) {
		const rect = { width, height: 1000 };
		const div = document.createElement("div");
		div.getBoundingClientRect = () => rect as DOMRect;
		return { ref: { current: div }, rect };
	}

	const notifyResize = () => act(() => resizeCallbacks.forEach((cb) => cb()));

	it("does not reset the sizes when the parent re-renders with the same initial sizes", () => {
		const { ref } = createResizableRef(1000);
		const setSizes = jest.fn();
		const { rerender } = renderHook(
			({ children }) =>
				useInitialSizesCalculator(ref, children, true, setSizes),
			{
				initialProps: {
					children: [fakePane({}), fakePane({ initialSize: 300 })],
				},
			},
		);
		setSizes.mockClear();

		rerender({ children: [fakePane({}), fakePane({ initialSize: 300 })] });

		expect(setSizes).not.toHaveBeenCalled();
	});

	it("recomputes when an initial size changes", () => {
		const { ref } = createResizableRef(1000);
		const setSizes = jest.fn();
		const { rerender } = renderHook(
			({ children }) =>
				useInitialSizesCalculator(ref, children, true, setSizes),
			{
				initialProps: {
					children: [fakePane({}), fakePane({ initialSize: 300 })],
				},
			},
		);

		rerender({ children: [fakePane({}), fakePane({ initialSize: 400 })] });

		expect(setSizes).toHaveBeenLastCalledWith([60, 40]);
	});

	it("keeps pixel sizes in pixels when the container is resized", () => {
		const { ref, rect } = createResizableRef(1000);
		const setSizes = jest.fn();
		renderHook(() =>
			useInitialSizesCalculator(
				ref,
				[fakePane({}), fakePane({ initialSize: 200 })],
				true,
				setSizes,
			),
		);

		rect.width = 800;
		notifyResize();

		expect(setSizes).toHaveBeenLastCalledWith([75, 25]);
	});

	it("waits for the container to have a size", () => {
		const { ref, rect } = createResizableRef(0);
		const setSizes = jest.fn();
		renderHook(() =>
			useInitialSizesCalculator(
				ref,
				[fakePane({}), fakePane({ initialSize: 200 })],
				true,
				setSizes,
			),
		);
		expect(setSizes).not.toHaveBeenCalled();

		rect.width = 1000;
		notifyResize();

		expect(setSizes).toHaveBeenCalledWith([80, 20]);
	});

	it("keeps a dragged pixel size when the container is resized", () => {
		const { ref, rect } = createResizableRef(1000);
		const setSizes = jest.fn();
		const { result } = renderHook(() =>
			useInitialSizesCalculator(
				ref,
				[fakePane({}), fakePane({ initialSize: 200 })],
				true,
				setSizes,
			),
		);

		result.current(1, { px: 400, percent: 40 });
		rect.width = 800;
		notifyResize();

		expect(setSizes).toHaveBeenLastCalledWith([50, 50]);
	});

	it("keeps a dragged size in percent for a pane sized in percent", () => {
		const { ref, rect } = createResizableRef(1000);
		const setSizes = jest.fn();
		const { result } = renderHook(() =>
			useInitialSizesCalculator(
				ref,
				[fakePane({}), fakePane({ initialSize: "45%" })],
				true,
				setSizes,
			),
		);

		result.current(1, { px: 300, percent: 30 });
		rect.width = 500;
		notifyResize();

		expect(setSizes).toHaveBeenLastCalledWith([70, 30]);
	});

	it("ignores a dragged size for a pane without an initial size", () => {
		const { ref, rect } = createResizableRef(1000);
		const setSizes = jest.fn();
		const { result } = renderHook(() =>
			useInitialSizesCalculator(
				ref,
				[fakePane({}), fakePane({ initialSize: 200 })],
				true,
				setSizes,
			),
		);

		result.current(0, { px: 700, percent: 70 });
		rect.width = 800;
		notifyResize();

		expect(setSizes).toHaveBeenLastCalledWith([75, 25]);
	});

	it("forgets a dragged size once the initial size changes", () => {
		const { ref } = createResizableRef(1000);
		const setSizes = jest.fn();
		const { result, rerender } = renderHook(
			({ children }) =>
				useInitialSizesCalculator(ref, children, true, setSizes),
			{
				initialProps: {
					children: [fakePane({}), fakePane({ initialSize: 200 })],
				},
			},
		);

		result.current(1, { px: 400, percent: 40 });
		rerender({ children: [fakePane({}), fakePane({ initialSize: 300 })] });
		notifyResize();

		expect(setSizes).toHaveBeenLastCalledWith([70, 30]);
	});
});
