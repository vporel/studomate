/**
 * @jest-environment jsdom
 */
import { getProductTourSeen } from "@/persistence/preferences.storage";
import startProductTour from "./start-product-tour";

const drive = jest.fn();
const driverFactory = jest.fn((_config: unknown) => ({ drive }));
jest.mock("driver.js", () => ({
	driver: (config: unknown) => driverFactory(config),
}));
jest.mock("driver.js/dist/driver.css", () => ({}), { virtual: true });

const labels = { next: "Next", previous: "Previous", done: "Finish" };
const steps = [
	{ id: "menubar", title: "Menu", description: "Menu description" },
	{ id: "explorer", title: "Explorer", description: "Explorer description" },
	{ id: "pages", title: "Pages", description: "Pages description" },
];

describe("startProductTour", () => {
	beforeEach(() => {
		localStorage.clear();
		jest.clearAllMocks();
	});

	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("drives only the steps whose anchor is mounted and marks the tour as seen", () => {
		document.body.innerHTML =
			'<div data-tour="menubar"></div><div data-tour="pages"></div>';

		const tour = startProductTour(steps, labels);

		expect(tour).not.toBeNull();
		expect(drive).toHaveBeenCalledTimes(1);
		expect(driverFactory).toHaveBeenCalledWith(
			expect.objectContaining({
				nextBtnText: "Next",
				prevBtnText: "Previous",
				doneBtnText: "Finish",
				steps: [
					{
						element: '[data-tour="menubar"]',
						popover: { title: "Menu", description: "Menu description" },
					},
					{
						element: '[data-tour="pages"]',
						popover: { title: "Pages", description: "Pages description" },
					},
				],
			}),
		);
		expect(getProductTourSeen()).toBe(true);
	});

	it("does nothing and stays unseen when no anchor is mounted", () => {
		expect(startProductTour(steps, labels)).toBeNull();
		expect(drive).not.toHaveBeenCalled();
		expect(getProductTourSeen()).toBe(false);
	});
});
