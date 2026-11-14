export const TOUR_ANCHOR_ATTRIBUTE = "data-tour";

/** `scopeSelector` restricts the anchor to a subtree (e.g. the active editor page). */
export function tourAnchorSelector(id: string, scopeSelector?: string): string {
	const anchor = `[${TOUR_ANCHOR_ATTRIBUTE}="${id}"]`;
	return scopeSelector ? `${scopeSelector} ${anchor}` : anchor;
}

/** Keeps the steps whose anchor is currently mounted (e.g. not the collapsed explorer). */
export function selectAvailableSteps<T extends { id: string }>(
	steps: T[],
	root: ParentNode,
): T[] {
	return steps.filter(
		(step) => root.querySelector(tourAnchorSelector(step.id)) !== null,
	);
}
