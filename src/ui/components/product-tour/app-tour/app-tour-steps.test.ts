import enTour from "@/i18n/messages/en/tour.json";
import frTour from "@/i18n/messages/fr/tour.json";
import { APP_TOUR_STEP_IDS } from "./app-tour-steps";

describe("APP_TOUR_STEP_IDS", () => {
	it("declares the steps in display order", () => {
		expect(APP_TOUR_STEP_IDS).toEqual([
			"menubar",
			"explorer",
			"pages",
			"hmiPages",
			"simulation",
			"crossReference",
			"analysis",
		]);
	});

	it.each([
		["fr", frTour],
		["en", enTour],
	])(
		"has a title and a description for every step (%s)",
		(_locale, messages) => {
			const steps = messages.steps as Record<
				string,
				{ title: string; description: string }
			>;
			for (const id of APP_TOUR_STEP_IDS) {
				expect(steps[id].title.trim()).not.toBe("");
				expect(steps[id].description.trim()).not.toBe("");
			}
		},
	);
});
