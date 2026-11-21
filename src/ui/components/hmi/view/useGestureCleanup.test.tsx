/** @jest-environment jsdom */
import { renderHook } from "@testing-library/react";
import useGestureCleanup from "./useGestureCleanup";

describe("useGestureCleanup", () => {
	it("runs the registered cleanup on unmount, and not before", () => {
		const { result, unmount, rerender } = renderHook(() => useGestureCleanup());
		const cleanup = jest.fn();
		result.current.current = cleanup;

		rerender();
		expect(cleanup).not.toHaveBeenCalled();
		unmount();

		expect(cleanup).toHaveBeenCalledTimes(1);
	});

	it("does nothing on unmount once the gesture has unregistered itself", () => {
		const { result, unmount } = renderHook(() => useGestureCleanup());
		const cleanup = jest.fn();
		result.current.current = cleanup;
		result.current.current = null;

		unmount();

		expect(cleanup).not.toHaveBeenCalled();
	});

	it("does nothing when no gesture was ever started", () => {
		const { unmount } = renderHook(() => useGestureCleanup());

		expect(() => unmount()).not.toThrow();
	});

	it("keeps the same ref across renders", () => {
		const { result, rerender } = renderHook(() => useGestureCleanup());
		const first = result.current;

		rerender();

		expect(result.current).toBe(first);
	});
});
