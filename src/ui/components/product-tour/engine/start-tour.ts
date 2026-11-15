import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { selectAvailableSteps, tourAnchorSelector } from "./tour-anchors";

export type TourStep = {
	id: string;
	title: string;
	description: string;
};

export type TourLabels = {
	next: string;
	previous: string;
	done: string;
};

let running = false;

/**
 * Starts the tour on the steps whose anchor is mounted and calls `onStarted` once it runs.
 * `null` when no anchor is mounted or another tour is on screen. With `scopeSelector`, only the
 * anchors inside the matching element count.
 */
export default function startTour(
	steps: TourStep[],
	labels: TourLabels,
	onStarted: () => void,
	scopeSelector?: string,
): Driver | null {
	const root = scopeSelector ? document.querySelector(scopeSelector) : document;
	if (running || !root) return null;
	const available = selectAvailableSteps(steps, root);
	if (available.length === 0) return null;

	onStarted();
	running = true;
	const tour = driver({
		onDestroyed: () => {
			running = false;
		},
		showProgress: true,
		progressText: "{{current}} / {{total}}",
		nextBtnText: labels.next,
		prevBtnText: labels.previous,
		doneBtnText: labels.done,
		steps: available.map((step) => ({
			element: tourAnchorSelector(step.id, scopeSelector),
			popover: { title: step.title, description: step.description },
		})),
	});
	tour.drive();
	return tour;
}
