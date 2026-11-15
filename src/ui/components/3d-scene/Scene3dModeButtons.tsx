"use client";

import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PictureInPictureAltIcon from "@mui/icons-material/PictureInPictureAlt";
import TabIcon from "@mui/icons-material/Tab";
import ViewSidebarIcon from "@mui/icons-material/ViewSidebar";
import { IconButton, type SxProps, type Theme } from "@mui/material";
import { type ComponentType } from "react";
import { Scene3dDisplayMode } from "@/ui/stores/project/scene3d-display-mode.enum";
import { useT } from "@/ui/i18n/useT";
import { useProjectStore } from "../projects/ProjectContext";

const MODE_ICONS: Record<
	Scene3dDisplayMode,
	ComponentType<{ fontSize?: "small" }>
> = {
	[Scene3dDisplayMode.SIDE_PANEL]: ViewSidebarIcon,
	[Scene3dDisplayMode.FLOATING_BOX]: PictureInPictureAltIcon,
	[Scene3dDisplayMode.PAGE]: TabIcon,
	[Scene3dDisplayMode.BROWSER_TAB]: OpenInNewIcon,
};

/** The modes of the environment the scene can switch to from `current`. */
export function useOtherScene3dModes(
	current: Scene3dDisplayMode,
): readonly Scene3dDisplayMode[] {
	const availableModes = useProjectStore(
		(state) => state.scene3dDisplayManager.availableModes,
	);
	return availableModes.filter((mode) => mode !== current);
}

/** One button per mode in `modes`, which shows the scene in that mode. */
export default function Scene3dModeButtons({
	modes,
	sx,
}: {
	modes: readonly Scene3dDisplayMode[];
	sx?: SxProps<Theme>;
}) {
	const t = useT("scene3d.showAs");
	const scene3dDisplayManager = useProjectStore(
		(state) => state.scene3dDisplayManager,
	);

	return modes.map((mode) => {
		const Icon = MODE_ICONS[mode];
		return (
			<IconButton
				key={mode}
				size="small"
				onClick={() => scene3dDisplayManager.show(mode)}
				aria-label={t(mode)}
				title={t(mode)}
				sx={sx}
			>
				<Icon fontSize="small" />
			</IconButton>
		);
	});
}
