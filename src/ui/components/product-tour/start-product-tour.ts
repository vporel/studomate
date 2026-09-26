import { setProductTourSeen } from "@/persistence/preferences.storage";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import {
	productTourAnchorSelector,
	selectAvailableSteps,
} from "./product-tour-steps";

export type ProductTourStep = {
	id: string;
	title: string;
	description: string;
};

export type ProductTourLabels = {
	next: string;
	previous: string;
	done: string;
};

/** Starts the tour on the mounted anchors and marks it as seen. `null` when no anchor is mounted. */
export default function startProductTour(
	steps: ProductTourStep[],
	labels: ProductTourLabels,
): Driver | null {
	const available = selectAvailableSteps(steps, document);
	if (available.length === 0) return null;

	setProductTourSeen();
	const tour = driver({
		showProgress: true,
		progressText: "{{current}} / {{total}}",
		nextBtnText: labels.next,
		prevBtnText: labels.previous,
		doneBtnText: labels.done,
		steps: available.map((step) => ({
			element: productTourAnchorSelector(step.id),
			popover: { title: step.title, description: step.description },
		})),
	});
	tour.drive();
	return tour;
}
