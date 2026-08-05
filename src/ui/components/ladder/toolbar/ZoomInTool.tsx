"use client";

import AppTool from "@/ui/components/app-toolbar/AppTool";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import { LADDER_FLOW_MAX_ZOOM } from "@/ui/stores/ladder/managers/view.manager";
import { ZoomIn as ZoomInIcon } from "@mui/icons-material";

const ZoomInTool = () => {
	const viewManager = useLadderStore((state) => state.viewManager);
	const zoom = useLadderStore((state) => state.zoom);

	return (
		<AppTool name="zoom-in" disabled={zoom >= LADDER_FLOW_MAX_ZOOM} onClick={() => viewManager.zoomIn()}>
			<ZoomInIcon />
		</AppTool>
	);
};

export default ZoomInTool;
