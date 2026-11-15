import enTour from "@/i18n/messages/en/tour.json";
import frTour from "@/i18n/messages/fr/tour.json";
import { EDITOR_TOUR_STEP_IDS } from "./editor-tour-step-builders";

describe.each([
	["fr", frTour],
	["en", enTour],
])("editor tour messages (%s)", (_locale, messages) => {
	it.each(Object.entries(EDITOR_TOUR_STEP_IDS))(
		"has a title and a description for every %s step",
		(kind, ids) => {
			const steps = (
				messages.editors as Record<
					string,
					{ steps: Record<string, { title: string; description: string }> }
				>
			)[kind].steps;
			expect(Object.keys(steps).sort()).toEqual([...ids].sort());
			for (const id of ids) {
				expect(steps[id].title.trim()).not.toBe("");
				expect(steps[id].description.trim()).not.toBe("");
			}
		},
	);
});
