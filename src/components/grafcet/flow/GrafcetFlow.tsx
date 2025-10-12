"use client";
import { usePagesContext } from "@/components/pages/context/PagesContext";
import { useProjectContext } from "@/components/projects/ProjectContext";
import { FLOW_GRID_CELL_WIDTH } from "@/constants";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import { Box, useTheme } from "@mui/material";
import { Background, Connection, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useState } from "react";
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

export function GrafcetFlowContent({ initialGrafcet }: { initialGrafcet: Grafcet }) {
	const th = useTheme();
	const [nodes, setNodes] = useState<GrafcetNode[]>(getInitialNodes(initialGrafcet));
	const [edges, setEdges] = useState<GrafcetEdge[]>(getInitialEdges(initialGrafcet));
	const { updateGrafcetData, setActiveScope } = useProjectContext();
	const { updatePageData } = usePagesContext();
	const { grafcetId, flowDimensions } = useGrafcetContext();
	const { onNodesChange, onNodesDelete, onNodeDragStop } = useNodesHandlers(setNodes);
	const { onEdgesChange, onConnect, onEdgesDelete } = useEdgesHandlers(setEdges);
	const [handleToolDragOver, handleToolDrop] = useToolDragOverHandlers();
	const handleShortcuts = useShortcutsHandler(grafcetId);
	const { onPaneContextMenu, onNodeContextMenu, onEdgeContextMenu } = useContextMenuOpeningHandlers();

	//Share the grafcet data with the project context
	useEffect(() => {
		updateGrafcetData(grafcetId, { flowNodes: nodes });
	}, [grafcetId, nodes, updateGrafcetData]);

	//Share the grafcet data
	useEffect(() => {
		updatePageData(grafcetId, {
			nodes,
			edges,
		});
	}, [grafcetId, nodes, edges, updatePageData]);

	//Context menu actions
	useContextMenuActionsHandlers();

	return (
		<Box
			className="grafcet-page"
			id={grafcetId}
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
						setActiveScope(grafcetId);
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
					<GrafcetContextMenu />
				</ReactFlow>
			</Box>
		</Box>
	);
}

export default function GrafcetFlow({
	grafcetId,
	initialGrafcet,
}: {
	grafcetId: string;
	initialGrafcet: Grafcet;
}) {
	return (
		<GrafcetContextProvider grafcetId={grafcetId}>
			<ReactFlowProvider>
				<GrafcetFlowContent initialGrafcet={initialGrafcet} />
			</ReactFlowProvider>
		</GrafcetContextProvider>
	);
}
