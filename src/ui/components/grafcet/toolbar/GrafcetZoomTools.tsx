"use client";

import ZoomControls from "@/ui/components/app-toolbar/ZoomControls";
import { GRAFCET_FLOW_MAX_ZOOM } from "@/ui/stores/grafcet/managers/view.manager";
import { useGrafcetStore } from "../context/GrafcetContext";
import { useT } from "@/ui/i18n/useT";

const GrafcetZoomTools = () => {
	const t = useT("grafcetEditor.toolbar");
	const viewManager = useGrafcetStore((state) => state.viewManager);
	const zoom = useGrafcetStore((state) => state.zoom);
	const minZoom = useGrafcetStore((state) => state.minZoom);

	return (
		<ZoomControls
			zoom={zoom}
			zoomInLabel={t("zoomIn")}
			zoomOutLabel={t("zoomOut")}
			canZoomIn={zoom !== null && zoom < GRAFCET_FLOW_MAX_ZOOM}
			canZoomOut={zoom !== null && zoom > minZoom}
			onZoomIn={() => viewManager.zoomIn()}
			onZoomOut={() => viewManager.zoomOut()}
		/>
	);
};

export default GrafcetZoomTools;
