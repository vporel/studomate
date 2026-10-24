"use client";

import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { Box } from "@mui/material";
import { useProjectStore } from "../projects/ProjectContext";
import WatchTables from "../watch-tables/WatchTables";

export const WATCH_PANEL_WIDTH_PX = 300;

export function useWatchPanelVisible(): boolean {
	return useProjectStore(
		(state) =>
			state.ui.watchTablesVisible && state.mode === ProjectMode.SIMULATION,
	);
}

/** The watch tables, next to the pages whatever the active tab. */
export default function EmbeddedWatchPanel() {
	const visible = useWatchPanelVisible();
	if (!visible) return null;

	return (
		<Box
			data-testid="embedded-watch-panel"
			sx={{
				height: "100%",
				backgroundColor: "white",
				boxShadow: "-2px 0 6px rgba(0, 0, 0, 0.08)",
			}}
		>
			<WatchTables />
		</Box>
	);
}
