"use client";

import FlexBox from "@/lib/boxes/FlexBox";
import { ZoomIn as ZoomInIcon, ZoomOut as ZoomOutIcon } from "@mui/icons-material";
import AppTool from "../app-toolbar/AppTool";
import { GRAFCET_FLOW_MAX_ZOOM, GRAFCET_FLOW_MIN_ZOOM } from "../grafcet/flow/GrafcetFlow";
import { useProjectStore } from "../projects/ProjectContext";

const ZoomInAction = () => {
	const activeScopeType = useProjectStore((state) => state.activeScopeType);
	const getActiveGrafcetStoreActions = useProjectStore((state) => state.getActiveGrafcetStoreActions);
	const activeGrafcetZoom = useProjectStore((state) => {
		const activeGrafcetStoreActions = state.getActiveGrafcetStoreActions();
		return activeGrafcetStoreActions ? activeGrafcetStoreActions.getZoom() : null;
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
				const actions = getActiveGrafcetStoreActions();
				actions?.zoomIn();
			}}
		>
			<ZoomInIcon />
		</AppTool>
	);
};

const ZoomOutAction = () => {
	const activeScopeType = useProjectStore((state) => state.activeScopeType);
	const getActiveGrafcetStoreActions = useProjectStore((state) => state.getActiveGrafcetStoreActions);
	const activeGrafcetZoom = useProjectStore((state) => {
		const activeGrafcetStoreActions = state.getActiveGrafcetStoreActions();
		return activeGrafcetStoreActions ? activeGrafcetStoreActions.getZoom() : null;
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
				const actions = getActiveGrafcetStoreActions();
				actions?.zoomOut();
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
