"use client";

import AppTool from "@/ui/components/app-toolbar/AppTool";
import { GRAFCET_FLOW_MIN_ZOOM } from "@/ui/stores/grafcet/managers/view.manager";
import { ZoomOut as ZoomOutIcon } from "@mui/icons-material";
import { useGrafcetStore } from "../context/GrafcetContext";

const ZoomOutTool = () => {
	const viewManager = useGrafcetStore((state) => state.viewManager);
	const activeGrafcetZoom = useGrafcetStore((state) => state.viewManager.getZoom());

	return (
		<AppTool
			name="zoom-out"
			disabled={activeGrafcetZoom === null || activeGrafcetZoom <= GRAFCET_FLOW_MIN_ZOOM}
			onClick={() => {
				viewManager.zoomOut();
			}}
		>
			<ZoomOutIcon />
		</AppTool>
	);
};

export default ZoomOutTool;
