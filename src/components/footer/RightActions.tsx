"use client";

import FlexBox from "@/lib/boxes/FlexBox";
import { ZoomIn as ZoomInIcon, ZoomOut as ZoomOutIcon } from "@mui/icons-material";
import AppTool from "../app-toolbar/AppTool";
import { GRAFCET_FLOW_MAX_ZOOM, GRAFCET_FLOW_MIN_ZOOM } from "../grafcet/flow/GrafcetFlow";
import { useProjectStore } from "../projects/ProjectContext";

const ZoomInAction = () => {
	const activeScopeType = useProjectStore((state) => state.activeScopeType);
	const activeGrafcetViewManager = useProjectStore(
		(state) => state.grafcetsManager.getActiveGrafcetStoreManagers()?.viewManager,
	);
	const activeGrafcetZoom = useProjectStore((state) => {
		const grafcetViewManager = state.grafcetsManager.getActiveGrafcetStoreManagers()?.viewManager;
		return grafcetViewManager?.getZoom() ?? null;
	});

	return (
		<AppTool
			name="zoom-in"
			disabled={
				activeScopeType !== "grafcet" ||
				activeGrafcetZoom === null ||
				activeGrafcetZoom >= GRAFCET_FLOW_MAX_ZOOM
			}
			onClick={() => {
				activeGrafcetViewManager?.zoomIn();
			}}
		>
			<ZoomInIcon />
		</AppTool>
	);
};

const ZoomOutAction = () => {
	const activeScopeType = useProjectStore((state) => state.activeScopeType);
	const activeGrafcetViewManager = useProjectStore(
		(state) => state.grafcetsManager.getActiveGrafcetStoreManagers()?.viewManager,
	);
	const activeGrafcetZoom = useProjectStore((state) => {
		const grafcetViewManager = state.grafcetsManager.getActiveGrafcetStoreManagers()?.viewManager;
		return grafcetViewManager?.getZoom() ?? null;
	});

	return (
		<AppTool
			name="zoom-out"
			disabled={
				activeScopeType !== "grafcet" ||
				activeGrafcetZoom === null ||
				activeGrafcetZoom <= GRAFCET_FLOW_MIN_ZOOM
			}
			onClick={() => {
				activeGrafcetViewManager?.zoomOut();
			}}
		>
			<ZoomOutIcon />
		</AppTool>
	);
};

const RightActions = () => {
	return (
		<FlexBox centerVertical gap={1}>
			<ZoomInAction />
			<ZoomOutAction />
		</FlexBox>
	);
};

export default RightActions;
