/**
 * @jest-environment jsdom
 */
import { act, render } from "@testing-library/react";
import AppTour from "./AppTour";

const startAppTour = jest.fn();
jest.mock("./useStartAppTour", () => ({
	__esModule: true,
	default: () => startAppTour,
}));

const shouldStartAppTour = jest.fn();
jest.mock("@/ui/components/product-tour/app-tour/app-tour-eligibility", () => ({
	__esModule: true,
	default: () => shouldStartAppTour(),
}));

describe("AppTour", () => {
	const destroy = jest.fn();

	beforeEach(() => {
		jest.useFakeTimers();
		jest.clearAllMocks();
		startAppTour.mockResolvedValue({ destroy });
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("starts the tour once the layout has settled when eligible", async () => {
		shouldStartAppTour.mockReturnValue(true);
		render(<AppTour />);
		expect(startAppTour).not.toHaveBeenCalled();

		await act(async () => {
			jest.advanceTimersByTime(500);
		});

		expect(startAppTour).toHaveBeenCalledTimes(1);
	});

	it("does not start the tour when not eligible", async () => {
		shouldStartAppTour.mockReturnValue(false);
		render(<AppTour />);

		await act(async () => {
			jest.advanceTimersByTime(500);
		});

		expect(startAppTour).not.toHaveBeenCalled();
	});

	it("does not start when unmounted before the delay elapses", async () => {
		shouldStartAppTour.mockReturnValue(true);
		const { unmount } = render(<AppTour />);
		unmount();

		await act(async () => {
			jest.advanceTimersByTime(500);
		});

		expect(startAppTour).not.toHaveBeenCalled();
	});

	it("destroys the running tour on unmount", async () => {
		shouldStartAppTour.mockReturnValue(true);
		const { unmount } = render(<AppTour />);
		await act(async () => {
			jest.advanceTimersByTime(500);
		});

		unmount();

		expect(destroy).toHaveBeenCalledTimes(1);
	});
});
