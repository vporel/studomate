/**
 * @jest-environment jsdom
 */
import type { Driver } from "driver.js";
import { renderHook } from "@testing-library/react";
import useAutoStartTour from "./useAutoStartTour";

const LAYOUT_DELAY = 400;

const fakeTour = () => ({ destroy: jest.fn() }) as unknown as Driver;

describe("useAutoStartTour", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("starts the tour once the layout has settled", async () => {
		const start = jest.fn().mockResolvedValue(fakeTour());
		renderHook(() => useAutoStartTour(start, () => true));

		await jest.advanceTimersByTimeAsync(LAYOUT_DELAY - 1);
		expect(start).not.toHaveBeenCalled();
		await jest.advanceTimersByTimeAsync(1);
		expect(start).toHaveBeenCalledTimes(1);
	});

	it("does nothing when the tour is not eligible", async () => {
		const start = jest.fn();
		renderHook(() => useAutoStartTour(start, () => false));

		await jest.advanceTimersByTimeAsync(LAYOUT_DELAY * 2);

		expect(start).not.toHaveBeenCalled();
		expect(jest.getTimerCount()).toBe(0);
	});

	it("cancels the pending start on unmount", async () => {
		const start = jest.fn().mockResolvedValue(fakeTour());
		const { unmount } = renderHook(() => useAutoStartTour(start, () => true));

		unmount();
		await jest.advanceTimersByTimeAsync(LAYOUT_DELAY * 2);

		expect(start).not.toHaveBeenCalled();
	});

	it("destroys the started tour on unmount", async () => {
		const tour = fakeTour();
		const start = jest.fn().mockResolvedValue(tour);
		const { unmount } = renderHook(() => useAutoStartTour(start, () => true));
		await jest.advanceTimersByTimeAsync(LAYOUT_DELAY);

		unmount();

		expect(tour.destroy).toHaveBeenCalledTimes(1);
	});

	it("destroys a tour that finishes starting after the unmount", async () => {
		const tour = fakeTour();
		let resolveStart: (value: Driver | null) => void = () => {};
		const start = jest.fn(
			() => new Promise<Driver | null>((resolve) => (resolveStart = resolve)),
		);
		const { unmount } = renderHook(() => useAutoStartTour(start, () => true));
		await jest.advanceTimersByTimeAsync(LAYOUT_DELAY);

		unmount();
		resolveStart(tour);
		await Promise.resolve();
		await Promise.resolve();

		expect(tour.destroy).toHaveBeenCalledTimes(1);
	});

	it("tolerates a tour that could not start", async () => {
		const start = jest.fn().mockResolvedValue(null);
		const { unmount } = renderHook(() => useAutoStartTour(start, () => true));
		await jest.advanceTimersByTimeAsync(LAYOUT_DELAY);

		expect(() => unmount()).not.toThrow();
	});
});
