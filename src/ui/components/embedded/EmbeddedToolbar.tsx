"use client";

import { useT } from "@/ui/i18n/useT";
import { canEdit } from "@/ui/stores/project/editability";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import { Box, IconButton, Tooltip } from "@mui/material";
import RedoTool from "../app-toolbar/RedoTool";
import UndoTool from "../app-toolbar/UndoTool";
import AnalyseButton from "../header/title-bar/AnalyseButton";
import ProjectModeSwitcher from "../header/title-bar/ProjectModeSwitcher";
import SimulationControls from "../header/title-bar/SimulationControls";
import SimulationModeSelect from "../header/title-bar/SimulationModeSelect";
import { useProjectContext, useProjectStore } from "../projects/ProjectContext";
import EmbeddedDialectSelect from "./EmbeddedDialectSelect";
import type { EmbeddedAppProps, EmbeddedControl } from "./embedded-app.types";

export const EMBEDDED_TOOLBAR_CONTROLS: readonly EmbeddedControl[] = [
	"mode",
	"analysis",
	"simulation",
	"history",
	"dialect",
	"fullscreen",
	"openInApp",
];

type EmbeddedToolbarProps = {
	controls: readonly EmbeddedControl[];
	appHref?: EmbeddedAppProps["appHref"];
	fullscreen: boolean;
	onToggleFullscreen: () => void;
};

export default function EmbeddedToolbar({
	controls,
	appHref,
	fullscreen,
	onToggleFullscreen,
}: EmbeddedToolbarProps) {
	const t = useT("embedded.fullscreen");
	const tApp = useT("embedded.app");
	const editable = useProjectStore(canEdit);
	const editingEnabled = useProjectStore((state) => state.editingEnabled);
	const store = useProjectContext();
	const has = (control: EmbeddedControl) => controls.includes(control);
	const openInApp = () => {
		const state = store?.getState();
		if (typeof appHref !== "function" || !state?.project) return;
		const { pagesOrder, activePageId } = state;
		window.open(
			appHref(state.project, { pagesOrder, activePageId }),
			"_blank",
			"noopener",
		);
	};

	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "center",
				gap: 1.5,
				flexShrink: 0,
				minHeight: 32,
				px: 1,
				backgroundColor: "white",
				borderBottom: "1px solid lightgray",
			}}
		>
			{has("analysis") && editingEnabled && <AnalyseButton />}
			{has("mode") && (
				<ProjectModeSwitcher
					withBoardModes={false}
					designAvailable={editingEnabled}
				/>
			)}
			{has("simulation") && (
				<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
					<SimulationModeSelect />
					<SimulationControls />
				</Box>
			)}
			{has("history") && editable && (
				<Box sx={{ display: "flex", alignItems: "center" }}>
					<UndoTool />
					<RedoTool />
				</Box>
			)}
			<Box
				sx={{
					marginLeft: "auto",
					display: "flex",
					alignItems: "center",
				}}
			>
				{has("dialect") && editable && (
					<Box sx={{ mr: 1.5 }}>
						<EmbeddedDialectSelect />
					</Box>
				)}
				{has("openInApp") && appHref && (
					<Tooltip title={tApp("open")}>
						<IconButton
							size="small"
							{...(typeof appHref === "string"
								? {
										component: "a",
										href: appHref,
										target: "_blank",
										rel: "noopener",
									}
								: { onClick: openInApp })}
							aria-label={tApp("open")}
						>
							<OpenInNewIcon />
						</IconButton>
					</Tooltip>
				)}
				{has("fullscreen") && (
					<Tooltip title={fullscreen ? t("exit") : t("enter")}>
						<IconButton
							size="small"
							aria-label={fullscreen ? t("exit") : t("enter")}
							onClick={onToggleFullscreen}
						>
							{fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
						</IconButton>
					</Tooltip>
				)}
			</Box>
		</Box>
	);
}
