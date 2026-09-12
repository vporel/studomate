"use client";

import AppTool from "@/ui/components/app-toolbar/AppTool";
import { GRAFCET_FLOW_MIN_ZOOM } from "@/ui/stores/grafcet/managers/view.manager";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import { useGrafcetStore } from "../context/GrafcetContext";
import { useT } from "@/ui/i18n/useT";

const ZoomOutTool = () => {
	const t = useT("grafcetEditor.toolbar");
	const viewManager = useGrafcetStore((state) => state.viewManager);
	const activeGrafcetZoom = useGrafcetStore((state) =>
		state.viewManager.getZoom(),
	);

	return (
		<AppTool
			name="zoom-out"
			label={t("zoomOut")}
			disabled={
				activeGrafcetZoom === null || activeGrafcetZoom <= GRAFCET_FLOW_MIN_ZOOM
			}
			onClick={() => {
				viewManager.zoomOut();
			}}
		>
			<ZoomOutIcon />
		</AppTool>
	);
};

export default ZoomOutTool;
