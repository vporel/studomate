"use client";

import CloseIcon from "@mui/icons-material/Close";
import { Box, Divider, IconButton, Typography } from "@mui/material";
import { Scene3dDisplayMode } from "@/ui/stores/project/scene3d-display-mode.enum";
import { useT } from "@/ui/i18n/useT";
import { useProjectStore } from "../projects/ProjectContext";
import InlineScene from "./InlineScene";
import Scene3dModeButtons, { useOtherScene3dModes } from "./Scene3dModeButtons";
import useInlineSceneLink from "./useInlineSceneLink";

/**
 * The 3D scene in the column on the right of the editors. It is linked to the editor, and its
 * WebGL context created, only while it is shown.
 */
export default function Scene3dSidePanel() {
	const t = useT("scene3d.view");
	const scene3dDisplayManager = useProjectStore(
		(state) => state.scene3dDisplayManager,
	);
	const link = useInlineSceneLink();
	const otherModes = useOtherScene3dModes(Scene3dDisplayMode.SIDE_PANEL);

	return (
		<Box
			role="region"
			aria-label={t("title")}
			sx={{ display: "flex", flexDirection: "column", height: "100%" }}
		>
			<Box sx={{ display: "flex", alignItems: "center", px: 1, py: 0.5 }}>
				<Typography variant="subtitle2" sx={{ flex: 1 }}>
					{t("title")}
				</Typography>
				<Scene3dModeButtons modes={otherModes} sx={{ p: 0.25 }} />
				<IconButton
					size="small"
					onClick={() => scene3dDisplayManager.close()}
					aria-label={t("close")}
					title={t("close")}
					sx={{ p: 0.25 }}
				>
					<CloseIcon fontSize="small" />
				</IconButton>
			</Box>
			<Divider />
			<Box
				sx={{
					flex: 1,
					minHeight: 0,
					position: "relative",
					overflow: "hidden",
				}}
			>
				<InlineScene {...link} foldPanels />
			</Box>
		</Box>
	);
}
