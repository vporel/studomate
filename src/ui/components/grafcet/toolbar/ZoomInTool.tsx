"use client";

import AppTool from "@/ui/components/app-toolbar/AppTool";
import { GRAFCET_FLOW_MAX_ZOOM } from "@/ui/stores/grafcet/managers/view.manager";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import { useGrafcetStore } from "../context/GrafcetContext";
import { useT } from "@/ui/i18n/useT";

const ZoomInTool = () => {
	const t = useT("grafcetEditor.toolbar");
	const viewManager = useGrafcetStore((state) => state.viewManager);
	const activeGrafcetZoom = useGrafcetStore((state) =>
		state.viewManager.getZoom(),
	);

	return (
		<AppTool
			name="zoom-in"
			label={t("zoomIn")}
			disabled={
				activeGrafcetZoom === null || activeGrafcetZoom >= GRAFCET_FLOW_MAX_ZOOM
			}
			onClick={() => {
				viewManager.zoomIn();
			}}
		>
			<ZoomInIcon />
		</AppTool>
	);
};

export default ZoomInTool;
