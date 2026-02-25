"use client";

import AppTool from "@/components/app-toolbar/AppTool";
import { GRAFCET_FLOW_MAX_ZOOM } from "@/stores/grafcet/managers/ViewManager";
import { ZoomIn as ZoomInIcon } from "@mui/icons-material";
import { useGrafcetStore } from "../context/GrafcetContext";

const ZoomInTool = () => {
	const viewManager = useGrafcetStore((state) => state.viewManager);
	const activeGrafcetZoom = useGrafcetStore((state) => state.viewManager.getZoom());

	return (
		<AppTool
			name="zoom-in"
			disabled={activeGrafcetZoom === null || activeGrafcetZoom >= GRAFCET_FLOW_MAX_ZOOM}
			onClick={() => {
				viewManager.zoomIn();
			}}
		>
			<ZoomInIcon />
		</AppTool>
	);
};

export default ZoomInTool;
