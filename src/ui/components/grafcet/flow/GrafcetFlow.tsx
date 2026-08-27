"use client";
import ConnectionsValidator from "@/schemas/grafcet/validators/connections.validator";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { FLOW_GRID_CELL_WIDTH } from "@/ui/constants";
import {
	GRAFCET_FLOW_MAX_ZOOM,
	GRAFCET_FLOW_MIN_ZOOM,
} from "@/ui/stores/grafcet/managers/view.manager";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { getFlowDimensions } from "@/ui/utils/grafcet/grafcet-utils";
import { Box, SxProps, Theme } from "@mui/material";
import {
	Background,
	IsValidConnection,
	OnConnect,
	OnDelete,
	OnEdgesChange,
	OnInit,
	OnMove,
	OnNodesChange,
	ReactFlow,
	ReactFlowProvider,
} from "@xyflow/react";
import {
	useCallback,
	useMemo,
	type WheelEvent as ReactWheelEvent,
} from "react";
import { useShallow } from "zustand/shallow";
import GrafcetContextMenu from "../context-menu/GrafcetContextMenu";
import { useGrafcetContext, useGrafcetStore } from "../context/GrafcetContext";
import GrafcetConnectionLine from "../edges/GrafcetConnectionLine";
import {
	edgeTypes,
	GrafcetEdgeType,
	GrafcetNodeType,
	nodeTypes,
} from "./grafcet-nodes-definitions";
import useContextMenuOpeningHandlers from "./useContextMenuOpeningHandlers";
import useToolDragOverHandlers from "./useToolDragOverHandlers";

import "@xyflow/react/dist/style.css";
import "./_grafcet-page.css";

const DEFAULT_EDGE_OPTIONS = { type: "grafcet-connection" } as const;
const SNAP_GRID: [number, number] = [
	FLOW_GRID_CELL_WIDTH,
	FLOW_GRID_CELL_WIDTH,
];

const OUTER_CONTAINER_SX: SxProps<Theme> = {
	padding: "25px",
	width: "100%",
	height: "100%",
	overflowX: "hidden",
	overflowY: "auto",
	background: (th) => th.palette.background.default,
	position: "relative",
};

const FLOW_CONTAINER_SX: SxProps<Theme> = {
	border: "1px solid lightgray",
	backgroundClip: "content-box",
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
			stroke: (th: Theme) => th.palette.primary.main,
		},
};

export function GrafcetFlowContent() {
	const setActiveScope = useProjectStore((state) => state.setActiveScope);
	const [handleToolDragOver, handleToolDrop] = useToolDragOverHandlers();
	const { onPaneContextMenu, onNodeContextMenu, onEdgeContextMenu } =
		useContextMenuOpeningHandlers();
	const { store } = useGrafcetContext();
	const grafcetId = useGrafcetStore((state) => state.grafcet.id);
	const grafcetFormat = useGrafcetStore((state) => state.grafcet.format);
	const nodes = useGrafcetStore(useShallow((state) => state.nodes));
	const edges = useGrafcetStore(useShallow((state) => state.edges));
	const viewManager = useGrafcetStore((state) => state.viewManager);
	const viewport = useGrafcetStore((state) => state.viewport);
	const workflowManager = useGrafcetStore((state) => state.workflowManager);
	const flowDimensions = useMemo(
		() => getFlowDimensions(grafcetFormat),
		[grafcetFormat],
	);
	const projectMode = useProjectStore((state) => state.mode);

	const setContainerElement = useCallback(
		(el: HTMLElement | null) => viewManager.setContainerElement(el),
		[viewManager],
	);
	const handleInit = useCallback<OnInit<GrafcetNodeType, GrafcetEdgeType>>(
		(instance) => viewManager.setReactFlowInstance(instance as any),
		[viewManager],
	);
	const handleMoveEnd = useCallback<OnMove>(
		(_, nextViewport) => viewManager.setViewport(nextViewport),
		[viewManager],
	);
	const handleNodesChange = useCallback<OnNodesChange<GrafcetNodeType>>(
		(changes) => workflowManager.handleNodesChange(changes),
		[workflowManager],
	);
	const handleConnect = useCallback<OnConnect>(
		(connection) => workflowManager.handleNewConnection(connection),
		[workflowManager],
	);
	const handleEdgesChange = useCallback<OnEdgesChange<GrafcetEdgeType>>(
		(changes) => workflowManager.handleEdgesChange(changes),
		[workflowManager],
	);
	const handleDelete = useCallback<OnDelete>(
		({ nodes, edges }) =>
			workflowManager.deleteNodesAndEdges(
				nodes.map((n) => n.id),
				edges.map((e) => e.id),
			),
		[workflowManager],
	);
	const isValidConnection = useCallback<IsValidConnection<GrafcetEdgeType>>(
		(connection) => {
			if (!viewManager.rfInstance) return false;
			return ConnectionsValidator.validateNewConnection(
				{
					sourceId: connection.source,
					targetId: connection.target,
					sourceHandle: connection.sourceHandle || "",
					targetHandle: connection.targetHandle || "",
				},
				store!.getState().grafcet!,
			);
		},
		[viewManager, store],
	);
	const handleFocus = useCallback(
		() => setActiveScope(grafcetId),
		[setActiveScope, grafcetId],
	);
	const handleWheelCapture = useCallback((e: ReactWheelEvent) => {
		if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
	}, []);
	const extent = useMemo<[[number, number], [number, number]]>(
		() => [
			[0, 0],
			[flowDimensions.width - 2, flowDimensions.height - 2],
		],
		[flowDimensions],
	);
	const flowContainerSx = useMemo<SxProps<Theme>>(
		() => ({
			...FLOW_CONTAINER_SX,
			width: flowDimensions.width + "px",
			height: flowDimensions.height + "px",
		}),
		[flowDimensions],
	);

	return (
		<Box
			className="grafcet-page"
			id={`grafcet-${grafcetId}`}
			ref={setContainerElement}
			sx={OUTER_CONTAINER_SX}
		>
			<Box sx={flowContainerSx}>
				<ReactFlow
					nodes={nodes}
					edges={edges}
					onInit={handleInit}
					defaultViewport={viewport ?? undefined}
					onMoveEnd={handleMoveEnd}
					nodesDraggable={projectMode === ProjectMode.DESIGN}
					nodesConnectable={projectMode === ProjectMode.DESIGN}
					elementsSelectable={projectMode === ProjectMode.DESIGN}
					onNodesChange={handleNodesChange}
					onConnect={handleConnect}
					onEdgesChange={handleEdgesChange}
					onDelete={handleDelete}
					nodeTypes={nodeTypes}
					edgeTypes={edgeTypes}
					defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
					connectionLineComponent={GrafcetConnectionLine}
					isValidConnection={isValidConnection}
					minZoom={GRAFCET_FLOW_MIN_ZOOM}
					maxZoom={GRAFCET_FLOW_MAX_ZOOM}
					snapToGrid={true}
					selectionOnDrag={true}
					panOnDrag={false}
					snapGrid={SNAP_GRID}
					translateExtent={extent}
					nodeExtent={extent}
					onDragOver={handleToolDragOver}
					onDrop={handleToolDrop}
					tabIndex={0} //This attribute is necessary so that the flow can be focused with the mouse click
					onFocus={handleFocus}
					onPaneContextMenu={onPaneContextMenu as any}
					onNodeContextMenu={onNodeContextMenu}
					onEdgeContextMenu={onEdgeContextMenu}
					zoomOnScroll={false}
					onWheelCapture={handleWheelCapture}
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
