/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
import type { TourStep } from "./start-tour";
import useStartTour, { type TourTranslator } from "./useStartTour";

const startTour = jest.fn();
jest.mock("./start-tour", () => ({
	__esModule: true,
	default: (...args: unknown[]) => startTour(...args),
}));

const STEPS: TourStep[] = [{ id: "toolbar", title: "T", description: "D" }];
const buildSteps = jest.fn((_t: TourTranslator) => STEPS);
const onStarted = jest.fn();

function renderStarter() {
	return renderHook(() => useStartTour(buildSteps, onStarted), {
		wrapper: i18nWrapper("fr"),
	}).result.current;
}

describe("useStartTour", () => {
	beforeEach(() => jest.clearAllMocks());

	it("starts the tour on the built steps, with the translated buttons", async () => {
		const tour = { destroy: jest.fn() };
		startTour.mockReturnValue(tour);

		const started = await renderStarter()();

		expect(started).toBe(tour);
		expect(buildSteps).toHaveBeenCalledTimes(1);
		expect(buildSteps.mock.calls[0][0]("buttons.next")).toBe("Suivant");
		expect(startTour).toHaveBeenCalledWith(
			STEPS,
			{ next: "Suivant", previous: "Précédent", done: "Terminer" },
			onStarted,
			undefined,
		);
	});

	it("restricts the tour to the given scope", async () => {
		await renderStarter()('[id="page-p1"]');

		expect(startTour).toHaveBeenCalledWith(
			STEPS,
			expect.anything(),
			onStarted,
			'[id="page-p1"]',
		);
	});

	it("resolves to null when the tour could not start", async () => {
		startTour.mockReturnValue(null);
		await expect(renderStarter()()).resolves.toBeNull();
	});
});
