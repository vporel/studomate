"use client";

import AppTool from "@/ui/components/app-toolbar/AppTool";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import { LADDER_FLOW_MIN_ZOOM } from "@/ui/stores/ladder/managers/view.manager";
import { ZoomOut as ZoomOutIcon } from "@mui/icons-material";

const ZoomOutTool = () => {
	const viewManager = useLadderStore((state) => state.viewManager);
	const zoom = useLadderStore((state) => state.zoom);

	return (
		<AppTool name="zoom-out" disabled={zoom <= LADDER_FLOW_MIN_ZOOM} onClick={() => viewManager.zoomOut()}>
			<ZoomOutIcon />
		</AppTool>
	);
};

export default ZoomOutTool;
