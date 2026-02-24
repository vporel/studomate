"use client";
import { useProjectStore } from "@/components/projects/ProjectContext";
import { FLOW_GRID_CELL_WIDTH } from "@/constants";
import ConnectionsValidator from "@/schemas/grafcet/validators/ConnectionsValidator.class";
import { getFlowDimensions } from "@/utils/grafcet/grafcet-utils";
import { Box, useTheme } from "@mui/material";
import { Background, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import { useShallow } from "zustand/shallow";
import CustomConnectionLine from "../connections-lines/CustomConnectionLine";
import GrafcetContextMenu from "../context-menu/GrafcetContextMenu";
import { useGrafcetContext, useGrafcetStore } from "../context/GrafcetContext";
import "./_grafcet-page.css";
import { edgeTypes, nodeTypes } from "./grafcet-nodes-definitions";
import useContextMenuOpeningHandlers from "./useContextMenuOpeningHandlers";
import useToolDragOverHandlers from "./useToolDragOverHandlers";

export const GRAFCET_FLOW_MIN_ZOOM = 1;
export const GRAFCET_FLOW_MAX_ZOOM = 2.5;

export function GrafcetFlowContent() {
	const th = useTheme();
	const setActiveScope = useProjectStore((state) => state.setActiveScope);
	const [handleToolDragOver, handleToolDrop] = useToolDragOverHandlers();
	const { onPaneContextMenu, onNodeContextMenu, onEdgeContextMenu } = useContextMenuOpeningHandlers();
	const { store } = useGrafcetContext();
	const grafcetId = useGrafcetStore((state) => state.grafcet.id);
	const grafcetFormat = useGrafcetStore((state) => state.grafcet.format);
	const nodes = useGrafcetStore(useShallow((state) => state.nodes));
	const edges = useGrafcetStore(useShallow((state) => state.edges));
	const viewManager = useGrafcetStore((state) => state.viewManager);
	const workflowManager = useGrafcetStore((state) => state.workflowManager);
	const flowDimensions = useMemo(() => getFlowDimensions(grafcetFormat), [grafcetFormat]);

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
					onInit={(instance) => viewManager.setReactFlowInstance(instance as any)}
					onNodesChange={(changes) => workflowManager.handleNodesChange(changes)}
					onConnect={(connection) => workflowManager.handleNewConnection(connection)}
					onEdgesChange={(changes) => workflowManager.handleEdgesChange(changes)}
					onDelete={({ nodes, edges }) => {
						workflowManager.deleteNodesAndEdges(
							nodes.map((n) => n.id),
							edges.map((e) => e.id),
						);
					}}
					nodeTypes={nodeTypes}
					edgeTypes={edgeTypes}
					defaultEdgeOptions={{ type: "custom-edge" }}
					connectionLineComponent={CustomConnectionLine}
					isValidConnection={(connection) => {
						if (!viewManager.rfInstance) return false;
						return ConnectionsValidator.validateConnection(
							{
								sourceId: connection.source,
								targetId: connection.target,
								sourceHandleId: connection.sourceHandle || "",
								targetHandleId: connection.targetHandle || "",
							},
							store!.getState().grafcet!,
						);
					}}
					minZoom={GRAFCET_FLOW_MIN_ZOOM}
					maxZoom={GRAFCET_FLOW_MAX_ZOOM}
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
					onFocus={() => setActiveScope(grafcetId)}
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

export default function GrafcetFlow() {
	return (
		<ReactFlowProvider>
			<GrafcetFlowContent />
		</ReactFlowProvider>
	);
}
