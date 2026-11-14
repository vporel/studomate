"use client";

import { Paper } from "@mui/material";
import { Scene3dDisplayMode } from "@/ui/stores/project/scene3d-display-mode.enum";
import InlineScene from "./InlineScene";
import Scene3dModeButtons, { useOtherScene3dModes } from "./Scene3dModeButtons";
import useInlineSceneLink from "./useInlineSceneLink";
import Page from "../pages/Page";
import { useProjectStore } from "../projects/ProjectContext";

/**
 * The 3D scene of the project. It is linked to the editor, and its WebGL context created, only
 * while its tab is displayed.
 */
export default function Scene3dPageView({ pageId }: { pageId: string }) {
	const link = useInlineSceneLink();
	const otherModes = useOtherScene3dModes(Scene3dDisplayMode.PAGE);
	const active = useProjectStore((state) => state.activePageId === pageId);

	return (
		<Page pageId={pageId} sx={{ position: "relative" }}>
			{active && <InlineScene {...link} />}
			{active && otherModes.length > 0 && (
				<Paper
					elevation={3}
					sx={{
						position: "absolute",
						left: 8,
						bottom: 8,
						zIndex: 2,
						display: "flex",
						gap: 0.25,
						p: 0.25,
					}}
				>
					<Scene3dModeButtons modes={otherModes} />
				</Paper>
			)}
		</Page>
	);
}
