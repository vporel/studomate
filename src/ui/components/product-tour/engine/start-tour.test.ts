/**
 * @jest-environment jsdom
 */
import startTour from "./start-tour";

const drive = jest.fn();
type DriverConfig = { onDestroyed?: () => void };
const driverFactory = jest.fn((_config: DriverConfig) => ({ drive }));
jest.mock("driver.js", () => ({
	driver: (config: DriverConfig) => driverFactory(config),
}));
jest.mock("driver.js/dist/driver.css", () => ({}), { virtual: true });

const labels = { next: "Next", previous: "Previous", done: "Finish" };
const steps = [
	{ id: "menubar", title: "Menu", description: "Menu description" },
	{ id: "explorer", title: "Explorer", description: "Explorer description" },
	{ id: "pages", title: "Pages", description: "Pages description" },
];

describe("startTour", () => {
	const onStarted = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	afterEach(() => {
		driverFactory.mock.calls.at(-1)?.[0].onDestroyed?.();
		document.body.innerHTML = "";
	});

	it("drives only the steps whose anchor is mounted and notifies the start", () => {
		document.body.innerHTML =
			'<div data-tour="menubar"></div><div data-tour="pages"></div>';

		const tour = startTour(steps, labels, onStarted);

		expect(tour).not.toBeNull();
		expect(drive).toHaveBeenCalledTimes(1);
		expect(onStarted).toHaveBeenCalledTimes(1);
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
	});

	it("does nothing and does not notify when no anchor is mounted", () => {
		expect(startTour(steps, labels, onStarted)).toBeNull();
		expect(drive).not.toHaveBeenCalled();
		expect(onStarted).not.toHaveBeenCalled();
	});

	it("refuses to start while another tour is on screen, then accepts again once it is destroyed", () => {
		document.body.innerHTML = '<div data-tour="menubar"></div>';
		expect(startTour(steps, labels, onStarted)).not.toBeNull();

		expect(startTour(steps, labels, onStarted)).toBeNull();
		expect(onStarted).toHaveBeenCalledTimes(1);

		driverFactory.mock.calls[0][0].onDestroyed?.();

		expect(startTour(steps, labels, onStarted)).not.toBeNull();
		expect(onStarted).toHaveBeenCalledTimes(2);
	});

	it("only drives the anchors inside the scope, ignoring the same anchor elsewhere", () => {
		document.body.innerHTML =
			'<div id="page-a"><div data-tour="menubar"></div></div>' +
			'<div id="page-b"><div data-tour="menubar"></div><div data-tour="pages"></div></div>';

		startTour(steps, labels, onStarted, "#page-a");

		expect(driverFactory.mock.calls[0][0]).toEqual(
			expect.objectContaining({
				steps: [
					{
						element: '#page-a [data-tour="menubar"]',
						popover: { title: "Menu", description: "Menu description" },
					},
				],
			}),
		);
	});

	it("does nothing when the scope is not in the document", () => {
		document.body.innerHTML = '<div data-tour="menubar"></div>';
		expect(startTour(steps, labels, onStarted, "#missing")).toBeNull();
		expect(onStarted).not.toHaveBeenCalled();
	});
});
