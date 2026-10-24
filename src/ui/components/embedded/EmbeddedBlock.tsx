"use client";

import { useT } from "@/ui/i18n/useT";
import { Box, Unstable_TrapFocus as FocusTrap } from "@mui/material";
import type { KeyboardEvent } from "react";
import { setLastMousePosition } from "@/ui/lib/mouse-position";
import handleEditingShortcut from "../projects/editing-shortcuts";
import { useProjectContext, useProjectStore } from "../projects/ProjectContext";
import type { EmbeddedAppProps, EmbeddedControl } from "./embedded-app.types";
import EmbeddedAnalysisPanel from "./EmbeddedAnalysisPanel";
import EmbeddedPages from "./EmbeddedPages";
import getVisibleTabIds from "./visible-tab-ids";
import EmbeddedStatusBar, {
	EMBEDDED_STATUS_BAR_CONTROLS,
} from "./EmbeddedStatusBar";
import EmbeddedTabBar from "./EmbeddedTabBar";
import EmbeddedToolbar, { EMBEDDED_TOOLBAR_CONTROLS } from "./EmbeddedToolbar";
import EmbeddedWatchPanel, {
	useWatchPanelVisible,
	WATCH_PANEL_WIDTH_PX,
} from "./EmbeddedWatchPanel";
import Pane from "@/ui/lib/split-pane/Pane";
import SplitPane from "@/ui/lib/split-pane/SplitPane";
import useEmbeddedFullscreen from "./useEmbeddedFullscreen";

const FULLSCREEN_MARGIN_PX = 40;
/** Above the application bar (1100), below the modals (1300) and what MUI portals into the body. */
const FULLSCREEN_Z_INDEX = 1200;

type EmbeddedBlockProps = {
	controls: readonly EmbeddedControl[];
	height: number | string;
	appHref?: EmbeddedAppProps["appHref"];
};

export default function EmbeddedBlock({
	controls,
	height,
	appHref,
}: EmbeddedBlockProps) {
	const t = useT("embedded");
	const { fullscreen, exit, toggle } = useEmbeddedFullscreen();
	const store = useProjectContext();
	const watchPanelVisible = useWatchPanelVisible();
	const tabsCount = useProjectStore(
		(state) => getVisibleTabIds(state.pagesOrder, state.pagesData).length,
	);

	const hasToolbar = controls.some((control) =>
		EMBEDDED_TOOLBAR_CONTROLS.includes(control),
	);
	const hasStatusBar = controls.some((control) =>
		EMBEDDED_STATUS_BAR_CONTROLS.includes(control),
	);

	//React events cross portals: what is typed in a menu or a dialog opened from the block also
	//reaches these handlers, while another block on the page never does.
	const handleKeyDown = (event: KeyboardEvent) => {
		if (store && handleEditingShortcut(event, store)) return;
		if (fullscreen && event.key === "Escape" && !event.defaultPrevented) {
			exit();
		}
	};

	return (
		<Box sx={{ height, position: "relative" }}>
			{fullscreen && (
				<Box
					data-testid="embedded-overlay"
					onClick={exit}
					sx={{
						position: "fixed",
						inset: 0,
						zIndex: FULLSCREEN_Z_INDEX - 1,
						backgroundColor: "rgba(0, 0, 0, 0.6)",
					}}
				/>
			)}
			<FocusTrap open={fullscreen}>
				<Box
					role="region"
					aria-label={t("region")}
					tabIndex={-1}
					data-embedded-block=""
					onKeyDown={handleKeyDown}
					onMouseMove={(event) =>
						setLastMousePosition(event.clientX, event.clientY)
					}
					sx={{
						display: "flex",
						flexDirection: "column",
						overflow: "hidden",
						backgroundColor: "rgb(235, 235, 235)",
						border: "1px solid lightgray",
						borderRadius: fullscreen ? "6px" : undefined,
						...(fullscreen
							? {
									position: "fixed",
									inset: FULLSCREEN_MARGIN_PX,
									zIndex: FULLSCREEN_Z_INDEX,
								}
							: { height: "100%" }),
					}}
				>
					{hasToolbar && (
						<EmbeddedToolbar
							controls={controls}
							appHref={appHref}
							fullscreen={fullscreen}
							onToggleFullscreen={toggle}
						/>
					)}
					{tabsCount > 1 && <EmbeddedTabBar />}
					<Box
						sx={{
							flex: 1,
							minHeight: 0,
							position: "relative",
							overflow: "hidden",
						}}
					>
						<SplitPane split="vertical">
							<Pane style={{ overflow: "hidden" }}>
								<Box
									sx={{
										display: "flex",
										height: "100%",
										"& > *": { minWidth: 0 },
									}}
								>
									<EmbeddedPages />
								</Box>
							</Pane>
							<Pane
								initialSize={WATCH_PANEL_WIDTH_PX}
								minSize={200}
								maxSize="50%"
								visible={watchPanelVisible}
							>
								<EmbeddedWatchPanel />
							</Pane>
						</SplitPane>
						<EmbeddedAnalysisPanel />
					</Box>
					{hasStatusBar && <EmbeddedStatusBar controls={controls} />}
				</Box>
			</FocusTrap>
		</Box>
	);
}
