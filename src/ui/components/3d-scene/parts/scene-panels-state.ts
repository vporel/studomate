export const PANEL_EDGE_MARGIN = 8;
const PANEL_MIN_HEIGHT = 80;

/** Whether a panel starts folded: with `foldPanels`, only the first one starts open. */
export function isPanelCollapsedByDefault(
	foldPanels: boolean,
	index: number,
): boolean {
	return foldPanels && index > 0;
}

/**
 * Height the panels may take in a scene `parentHeight` high, under the `headerHeight` of the box
 * that holds them and between its margins.
 */
export function panelsMaxHeight(
	parentHeight: number,
	headerHeight: number,
): number {
	return Math.max(
		PANEL_MIN_HEIGHT,
		parentHeight - 2 * PANEL_EDGE_MARGIN - headerHeight,
	);
}
