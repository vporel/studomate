"use client";

import AppTool from "@/ui/components/app-toolbar/AppTool";
import HmiWidgetToolbarItem from "@/ui/components/hmi/toolbar/HmiWidgetToolbarItem";
import Page from "@/ui/components/pages/Page";
import FlexBox from "@/ui/lib/boxes/FlexBox";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import { Box, Divider, Typography } from "@mui/material";
import { useState } from "react";
import {
	HMI_SHAPE_TOOLS,
	HMI_WIDGET_TOOLS,
} from "@/ui/components/hmi/toolbar/hmi-widget-tools";
import {
	clampZoom,
	ZOOM_DEFAULT,
	ZOOM_MAX,
	ZOOM_MIN,
	ZOOM_STEP,
} from "./constants";
import HmiCanvas from "./HmiCanvas";

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
}

const HmiPageContent = ({
	hmiPageId,
	tabPageId,
	isSimulation = false,
}: HmiPageContentProps) => {
	const [zoom, setZoom] = useState(ZOOM_DEFAULT);

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
					{!isSimulation && (
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
				<FlexBox centerVertical sx={{ gap: "5px", height: "100%" }}>
					<AppTool
						name="hmi-zoom-out"
						label="Zoom arrière"
						disabled={zoom <= ZOOM_MIN}
						onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
					>
						<ZoomOutIcon />
					</AppTool>
					<Typography
						onClick={() => setZoom(ZOOM_DEFAULT)}
						sx={{
							fontSize: "0.75rem",
							minWidth: 36,
							textAlign: "center",
							cursor: "pointer",
							userSelect: "none",
							color: "text.secondary",
						}}
					>
						{Math.round(zoom * 100)}%
					</Typography>
					<AppTool
						name="hmi-zoom-in"
						label="Zoom avant"
						disabled={zoom >= ZOOM_MAX}
						onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
					>
						<ZoomInIcon />
					</AppTool>
				</FlexBox>
			</FlexBox>

			<Box
				sx={{
					flex: 1,
					overflow: "auto",
					backgroundColor: "rgb(235,235,235)",
					p: 2,
				}}
			>
				<HmiCanvas
					isSimulation={isSimulation}
					zoom={zoom}
					onZoomChange={setZoom}
				/>
			</Box>
		</Page>
	);
};

export default HmiPageContent;
