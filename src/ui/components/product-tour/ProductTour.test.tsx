/**
 * @jest-environment jsdom
 */
import { act, render } from "@testing-library/react";
import ProductTour from "./ProductTour";

const startProductTour = jest.fn();
jest.mock("./useStartProductTour", () => ({
	__esModule: true,
	default: () => startProductTour,
}));

const shouldStartProductTour = jest.fn();
jest.mock("@/ui/components/product-tour/product-tour-eligibility", () => ({
	__esModule: true,
	default: () => shouldStartProductTour(),
}));

describe("ProductTour", () => {
	const destroy = jest.fn();

	beforeEach(() => {
		jest.useFakeTimers();
		jest.clearAllMocks();
		startProductTour.mockResolvedValue({ destroy });
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("starts the tour once the layout has settled when eligible", async () => {
		shouldStartProductTour.mockReturnValue(true);
		render(<ProductTour />);
		expect(startProductTour).not.toHaveBeenCalled();

		await act(async () => {
			jest.advanceTimersByTime(500);
		});

		expect(startProductTour).toHaveBeenCalledTimes(1);
	});

	it("does not start the tour when not eligible", async () => {
		shouldStartProductTour.mockReturnValue(false);
		render(<ProductTour />);

		await act(async () => {
			jest.advanceTimersByTime(500);
		});

		expect(startProductTour).not.toHaveBeenCalled();
	});

	it("does not start when unmounted before the delay elapses", async () => {
		shouldStartProductTour.mockReturnValue(true);
		const { unmount } = render(<ProductTour />);
		unmount();

		await act(async () => {
			jest.advanceTimersByTime(500);
		});

		expect(startProductTour).not.toHaveBeenCalled();
	});

	it("destroys the running tour on unmount", async () => {
		shouldStartProductTour.mockReturnValue(true);
		const { unmount } = render(<ProductTour />);
		await act(async () => {
			jest.advanceTimersByTime(500);
		});

		unmount();

		expect(destroy).toHaveBeenCalledTimes(1);
	});
});
