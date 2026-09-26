export const PRODUCT_TOUR_STEP_IDS = [
	"menubar",
	"explorer",
	"pages",
	"hmiPages",
	"simulation",
	"crossReference",
	"analysis",
] as const;

export type ProductTourStepId = (typeof PRODUCT_TOUR_STEP_IDS)[number];

export const PRODUCT_TOUR_ANCHOR_ATTRIBUTE = "data-tour";

export function productTourAnchorSelector(id: string): string {
	return `[${PRODUCT_TOUR_ANCHOR_ATTRIBUTE}="${id}"]`;
}

/** Keeps the steps whose anchor is currently mounted (e.g. not the collapsed explorer). */
export function selectAvailableSteps<T extends { id: string }>(
	steps: T[],
	root: ParentNode,
): T[] {
	return steps.filter(
		(step) => root.querySelector(productTourAnchorSelector(step.id)) !== null,
	);
}
