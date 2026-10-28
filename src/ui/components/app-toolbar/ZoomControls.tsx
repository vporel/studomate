"use client";

import FlexBox from "@/ui/lib/boxes/FlexBox";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import { Typography } from "@mui/material";
import AppTool from "./AppTool";

/** Zoom out, current level, zoom in: the zoom tools of the editors' toolbars. */
const ZoomControls = ({
	zoom,
	zoomInLabel,
	zoomOutLabel,
	canZoomIn,
	canZoomOut,
	onZoomIn,
	onZoomOut,
	onLevelClick,
	toolNamePrefix = "",
}: {
	/** Absent until the editor knows its zoom: the level is then left blank. */
	zoom: number | null;
	zoomInLabel: string;
	zoomOutLabel: string;
	canZoomIn: boolean;
	canZoomOut: boolean;
	onZoomIn: () => void;
	onZoomOut: () => void;
	onLevelClick?: () => void;
	/** Prefixes the tools' `app-toolbar__<name>` class names. */
	toolNamePrefix?: string;
}) => (
	<FlexBox centerVertical sx={{ gap: "5px", height: "100%" }}>
		<AppTool
			name={`${toolNamePrefix}zoom-out`}
			label={zoomOutLabel}
			disabled={!canZoomOut}
			onClick={onZoomOut}
		>
			<ZoomOutIcon />
		</AppTool>
		<Typography
			onClick={onLevelClick}
			sx={{
				fontSize: "0.75rem",
				minWidth: 36,
				textAlign: "center",
				cursor: onLevelClick ? "pointer" : "default",
				userSelect: "none",
				color: "text.secondary",
			}}
		>
			{zoom === null ? "" : `${Math.round(zoom * 100)}%`}
		</Typography>
		<AppTool
			name={`${toolNamePrefix}zoom-in`}
			label={zoomInLabel}
			disabled={!canZoomIn}
			onClick={onZoomIn}
		>
			<ZoomInIcon />
		</AppTool>
	</FlexBox>
);

export default ZoomControls;
