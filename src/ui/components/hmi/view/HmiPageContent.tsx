"use client";

import ZoomControls from "@/ui/components/app-toolbar/ZoomControls";
import HmiWidgetToolbarItem from "@/ui/components/hmi/toolbar/HmiWidgetToolbarItem";
import Page from "@/ui/components/pages/Page";
import FlexBox from "@/ui/lib/boxes/FlexBox";
import { Box, Divider } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import usePageEditingEnabled from "@/ui/components/projects/usePageEditingEnabled";
import { useT } from "@/ui/i18n/useT";
import useCtrlWheelZoom from "@/ui/lib/hooks/useCtrlWheelZoom";
import {
	HMI_SHAPE_TOOLS,
	HMI_WIDGET_TOOLS,
} from "@/ui/components/hmi/toolbar/hmi-widget-tools";
import {
	clampZoom,
	FIT_ZOOM_MIN,
	ZOOM_DEFAULT,
	ZOOM_MAX,
	ZOOM_MIN,
	ZOOM_STEP,
} from "@/ui/components/hmi/logic/constants";
import getHmiFitZoom from "@/ui/components/hmi/logic/hmi-fit-zoom";
import HmiCanvas from "./HmiCanvas";

/** Space taken around the canvas: the scroll area padding and the canvas row padding, on each axis. */
const CANVAS_SURROUND_PX = 2 * 16 + 2 * 8;
/** Width of the editing sidebar and the gap separating it from the canvas. */
const SIDEBAR_WIDTH_PX = 300 + 8;

interface HmiPageContentProps {
	hmiPageId: string;
	/** Id de l'onglet à des fins de visibilité (voir `Page`) — absent : `hmiPageId`. Distinct de
	 * `hmiPageId` pour la vue simulation HMI (voir `HmiSimulationPageView`), dont l'onglet a un id
	 * fixe (`HMI_SIMULATION_PAGE_ID`) indépendant de la page HMI affichée à un instant donné. */
	tabPageId?: string;
	/** `true` pour la vue simulation HMI (voir `HmiSimulationPageView`) : widgets interactifs,
	 * palette d'outils masquée, édition désactivée. Absent (`false`) pour une page HMI de
	 * conception, qui reste toujours éditable — modifier une page HMI n'a aucune incidence sur
	 * l'exécution du programme, contrairement à GRAFCET/Ladder. */
	isSimulation?: boolean;
	/** The zoom follows the space available until the user sets it. */
	fitToContainer?: boolean;
}

const HmiPageContent = ({
	hmiPageId,
	tabPageId,
	isSimulation = false,
	fitToContainer = false,
}: HmiPageContentProps) => {
	const t = useT("hmiEditor.toolbar");
	const [zoom, setZoom] = useState(ZOOM_DEFAULT);
	const [fitting, setFitting] = useState(fitToContainer);
	const scrollAreaRef = useRef<HTMLDivElement | null>(null);
	const showPalette = usePageEditingEnabled(hmiPageId) && !isSimulation;
	const minZoom = fitToContainer ? FIT_ZOOM_MIN : ZOOM_MIN;

	const setManualZoom = useCallback((next: (z: number) => number) => {
		setFitting(false);
		setZoom(next);
	}, []);
	useCtrlWheelZoom(scrollAreaRef, (direction) =>
		setManualZoom((z) => clampZoom(z + direction * ZOOM_STEP, minZoom)),
	);

	useEffect(() => {
		const area = scrollAreaRef.current;
		if (!fitting || !area || typeof ResizeObserver === "undefined") return;
		const refit = () =>
			setZoom(
				getHmiFitZoom({
					availableWidth:
						area.clientWidth -
						CANVAS_SURROUND_PX -
						(showPalette ? SIDEBAR_WIDTH_PX : 0),
					availableHeight: area.clientHeight - CANVAS_SURROUND_PX,
					minZoom: FIT_ZOOM_MIN,
				}),
			);
		const observer = new ResizeObserver(refit);
		observer.observe(area);
		return () => observer.disconnect();
	}, [fitting, showPalette]);

	return (
		<Page pageId={tabPageId ?? hmiPageId} sx={{ flexDirection: "column" }}>
			<FlexBox
				centerVertical
				between
				sx={{
					width: "100%",
					height: "38px",
					borderBottom: "1px solid lightgray",
					backgroundColor: "white",
					padding: "10px 5px",
					gap: "5px",
					flexShrink: 0,
				}}
			>
				{/* Gauche — palette de widgets à glisser-déposer sur le canvas, masquée en simulation */}
				<FlexBox centerVertical sx={{ gap: "5px", height: "100%" }}>
					{showPalette && (
						<>
							{HMI_WIDGET_TOOLS.map((tool) => (
								<HmiWidgetToolbarItem
									key={tool.label ?? tool.type}
									tool={tool}
								/>
							))}
							<Divider orientation="vertical" style={{ margin: "5px" }} />
							{HMI_SHAPE_TOOLS.map((tool) => (
								<HmiWidgetToolbarItem
									key={tool.label ?? tool.type}
									tool={tool}
								/>
							))}
						</>
					)}
				</FlexBox>

				{/* Droite — contrôles de zoom */}
				<ZoomControls
					toolNamePrefix="hmi-"
					zoom={zoom}
					zoomInLabel={t("zoomIn")}
					zoomOutLabel={t("zoomOut")}
					canZoomIn={zoom < ZOOM_MAX}
					canZoomOut={zoom > minZoom}
					onZoomIn={() =>
						setManualZoom((z) => clampZoom(z + ZOOM_STEP, minZoom))
					}
					onZoomOut={() =>
						setManualZoom((z) => clampZoom(z - ZOOM_STEP, minZoom))
					}
					onLevelClick={() => {
						if (fitToContainer) setFitting(true);
						else setZoom(ZOOM_DEFAULT);
					}}
				/>
			</FlexBox>

			<Box
				ref={scrollAreaRef}
				sx={{
					flex: 1,
					overflow: "auto",
					backgroundColor: "rgb(235,235,235)",
					p: 2,
				}}
			>
				<HmiCanvas isSimulation={isSimulation} zoom={zoom} />
			</Box>
		</Page>
	);
};

export default HmiPageContent;
