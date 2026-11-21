import type { ProjectUiState } from "./project.store.types";

export const BOTTOM_PANEL_TABS = ["analysis", "crossReference"] as const;

export type BottomPanelTab = (typeof BOTTOM_PANEL_TABS)[number];

type BottomPanelUi = Pick<
	ProjectUiState,
	"analysisResultVisible" | "crossReferenceResultVisible"
>;

const TAB_FLAGS: Record<BottomPanelTab, keyof BottomPanelUi> = {
	analysis: "analysisResultVisible",
	crossReference: "crossReferenceResultVisible",
};

/** The tab whose content is shown, `null` when the panel is closed. */
export function getActiveBottomPanelTab(
	ui: BottomPanelUi,
): BottomPanelTab | null {
	return BOTTOM_PANEL_TABS.find((tab) => ui[TAB_FLAGS[tab]]) ?? null;
}

/**
 * Shows a tab (the panel opens on it, or switches to it), or closes it when it is the one shown.
 * Closing a tab that is not shown changes nothing.
 */
export function setBottomPanelTabOpen<T extends BottomPanelUi>(
	ui: T,
	tab: BottomPanelTab,
	open: boolean,
): T {
	if (!open) return { ...ui, [TAB_FLAGS[tab]]: false };
	return {
		...ui,
		analysisResultVisible: tab === "analysis",
		crossReferenceResultVisible: tab === "crossReference",
	};
}
