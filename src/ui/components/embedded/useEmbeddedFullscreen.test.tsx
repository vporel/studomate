/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import useEmbeddedFullscreen from "./useEmbeddedFullscreen";

describe("useEmbeddedFullscreen", () => {
	afterEach(() => {
		document.body.style.overflow = "";
	});

	it("starts outside the full screen and toggles it", () => {
		const { result } = renderHook(() => useEmbeddedFullscreen());
		expect(result.current.fullscreen).toBe(false);

		act(() => result.current.toggle());
		expect(result.current.fullscreen).toBe(true);

		act(() => result.current.toggle());
		expect(result.current.fullscreen).toBe(false);
	});

	it("leaves the full screen when another block enters it", () => {
		const first = renderHook(() => useEmbeddedFullscreen());
		const second = renderHook(() => useEmbeddedFullscreen());
		act(() => first.result.current.toggle());
		expect(first.result.current.fullscreen).toBe(true);

		act(() => second.result.current.toggle());

		expect(second.result.current.fullscreen).toBe(true);
		expect(first.result.current.fullscreen).toBe(false);
	});

	it("locks the scrolling of the page while in full screen and restores it on exit", () => {
		document.body.style.overflow = "auto";
		const { result } = renderHook(() => useEmbeddedFullscreen());

		act(() => result.current.toggle());
		expect(document.body.style.overflow).toBe("hidden");

		act(() => result.current.exit());
		expect(document.body.style.overflow).toBe("auto");
	});

	it("restores the scrolling when unmounted while in full screen", () => {
		document.body.style.overflow = "auto";
		const { result, unmount } = renderHook(() => useEmbeddedFullscreen());
		act(() => result.current.toggle());

		unmount();

		expect(document.body.style.overflow).toBe("auto");
	});

	it("stops listening to the other blocks once unmounted", () => {
		const removeListener = jest.spyOn(window, "removeEventListener");
		const { unmount } = renderHook(() => useEmbeddedFullscreen());

		unmount();

		expect(removeListener).toHaveBeenCalledWith(
			"studomate:embedded-fullscreen",
			expect.any(Function),
		);
		removeListener.mockRestore();
	});
});
