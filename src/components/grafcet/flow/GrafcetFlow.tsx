"use client";
import { usePagesContext } from "@/components/pages/context/PagesContext";
import { useProjectContext } from "@/components/projects/ProjectContext";
import { FLOW_GRID_CELL_WIDTH, PAPERS_SIZES } from "@/constants";
import { mmToPx } from "@/lib/utils";
import Grafcet, { GrafcetFormat } from "@/schemas/grafcet/Grafcet.class";
import { Box, useTheme } from "@mui/material";
import { Background, Connection, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useState } from "react";
import CustomConnectionLine from "../connections-lines/CustomConnectionLine";
import GrafcetContextMenu from "../context-menu/GrafcetContextMenu";
import { GrafcetContextProvider, useGrafcetContext } from "../context/GrafcetContext";
import "./_grafcet-page.css";
import {
	edgeTypes,
	GrafcetEdge,
	GrafcetNode,
	nodeTypes,
	validateConnection,
} from "./grafcet-nodes-definitions";
import useContextMenuActionsHandlers from "./useContextMenuActionsHandlers";
import useContextMenuOpeningHandlers from "./useContextMenuOpeningHandlers";
import useEdgesHandlers from "./useEdgesHandlers";
import useNodesHandlers from "./useNodesHandlers";
import useShortcutsHandler from "./useShortcutsHandler";
import useToolDragOverHandlers from "./useToolDragOverHandlers";

function getInitialNodes(initialGrafcet: Grafcet): GrafcetNode[] {
	return [];
}

function getInitialEdges(initialGrafcet: Grafcet): GrafcetEdge[] {
	return [];
}

function getFlowDimensions(format: GrafcetFormat) {
	switch (format.type) {
		case "A4":
			return {
				width: mmToPx(
					format.orientation === "portrait"
						? PAPERS_SIZES.A4_PORTRAIT.width
						: PAPERS_SIZES.A4_LANDSCAPE.width
				),
				height: mmToPx(
					format.orientation === "portrait"
						? PAPERS_SIZES.A4_PORTRAIT.height
						: PAPERS_SIZES.A4_LANDSCAPE.height
				),
			};
		case "A3":
			return {
				width: mmToPx(
					format.orientation === "portrait"
						? PAPERS_SIZES.A3_PORTRAIT.width
						: PAPERS_SIZES.A3_LANDSCAPE.width
				),
				height: mmToPx(
					format.orientation === "portrait"
						? PAPERS_SIZES.A3_PORTRAIT.height
						: PAPERS_SIZES.A3_LANDSCAPE.height
				),
			};
	}
}

export function GrafcetFlowContent() {
	const th = useTheme();
	const { grafcet } = useGrafcetContext();
	const [nodes, setNodes] = useState<GrafcetNode[]>(getInitialNodes(grafcet));
	const [edges, setEdges] = useState<GrafcetEdge[]>(getInitialEdges(grafcet));
	const { updateGrafcetData, setActiveScope } = useProjectContext();
	const { updatePageData } = usePagesContext();
	const flowDimensions = useMemo(() => getFlowDimensions(grafcet.format), [grafcet.format]);
	const { onNodesChange, onNodesDelete, onNodeDragStop } = useNodesHandlers(setNodes);
	const { onEdgesChange, onConnect, onEdgesDelete } = useEdgesHandlers(setEdges);
	const [handleToolDragOver, handleToolDrop] = useToolDragOverHandlers();
	const handleShortcuts = useShortcutsHandler(grafcet.id);
	const { onPaneContextMenu, onNodeContextMenu, onEdgeContextMenu } = useContextMenuOpeningHandlers();

	//Share the grafcet data with the project context
	useEffect(() => {
		updateGrafcetData(grafcet.id, { flowNodes: nodes });
	}, [grafcet.id, nodes, updateGrafcetData]);

	//Share the grafcet data
	useEffect(() => {
		updatePageData(grafcet.id, {
			nodes,
			edges,
		});
	}, [grafcet.id, nodes, edges, updatePageData]);

	//Context menu actions
	useContextMenuActionsHandlers();

	return (
		<Box
			className="grafcet-page"
			id={grafcet.id}
			sx={{
				padding: "25px",
				width: "100%",
				height: "100%",
				overflowX: "hidden",
				overflowY: "auto",
				background: "rgb(235, 235, 235)",
				position: "relative",
			}}
		>
			<Box
				sx={{
					width: flowDimensions.width + "px",
					height: flowDimensions.height + "px",
					border: "1px solid lightgray",
					backgroundClip: "content-box",
					boxSizing: "border-box",
					marginLeft: "50%",
					transform: "translate(-50%, 0)",
					".react-flow__pane": {
						cursor: "default",
					},
					".react-flow__edge-path": {
						stroke: "black",
					},
					".react-flow__edge.selected .react-flow__edge-path, .react-flow__edge.selectable:focus .react-flow__edge-path":
						{
							stroke: th.palette.primary.main,
						},
				}}
			>
				<ReactFlow
					nodes={nodes}
					edges={edges}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					onNodesDelete={onNodesDelete}
					onNodeDragStop={onNodeDragStop}
					onConnect={onConnect}
					onEdgesDelete={onEdgesDelete}
					nodeTypes={nodeTypes}
					edgeTypes={edgeTypes}
					defaultEdgeOptions={{ type: "custom-edge" }}
					connectionLineComponent={CustomConnectionLine}
					isValidConnection={(connection) => validateConnection(connection as Connection, nodes)}
					minZoom={0.5}
					maxZoom={2}
					snapToGrid={true}
					selectionOnDrag={true}
					panOnDrag={false}
					snapGrid={[FLOW_GRID_CELL_WIDTH, FLOW_GRID_CELL_WIDTH]}
					translateExtent={[
						[0, 0],
						[flowDimensions.width - 2, flowDimensions.height - 2],
					]}
					nodeExtent={[
						[0, 0],
						[flowDimensions.width - 2, flowDimensions.height - 2],
					]}
					onDragOver={handleToolDragOver}
					onDrop={handleToolDrop}
					tabIndex={0} //This attribute is necessary so that the flow can be focused with the mouse click
					onFocus={() => {
						setActiveScope(grafcet.id);
					}}
					onKeyDown={handleShortcuts}
					onPaneContextMenu={onPaneContextMenu as any}
					onNodeContextMenu={onNodeContextMenu}
					onEdgeContextMenu={onEdgeContextMenu}
					zoomOnScroll={false}
					onWheelCapture={(e) => {
						if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
					}}
				>
					<Background bgColor="white" />
					<GrafcetContextMenu flowDimensions={flowDimensions} />
				</ReactFlow>
			</Box>
		</Box>
	);
}

export default function GrafcetFlow({ initialGrafcet }: { initialGrafcet: Grafcet }) {
	return (
		<GrafcetContextProvider initialGrafcet={initialGrafcet}>
			<ReactFlowProvider>
				<GrafcetFlowContent />
			</ReactFlowProvider>
		</GrafcetContextProvider>
	);
}
