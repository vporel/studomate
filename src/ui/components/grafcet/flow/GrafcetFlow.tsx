"use client";
import useCanEdit from "@/ui/components/projects/useCanEdit";
import usePageEditingEnabled from "@/ui/components/projects/usePageEditingEnabled";
import ConnectionsValidator from "@/schemas/grafcet/validators/connections.validator";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { FLOW_GRID_CELL_WIDTH } from "@/ui/constants";
import {
	GRAFCET_FLOW_MAX_ZOOM,
	GRAFCET_FLOW_MIN_ZOOM,
} from "@/ui/stores/grafcet/managers/view.manager";
import {
	GRAFCET_PAGE_DIMENSIONS,
	getPageFitZoom,
} from "@/ui/utils/grafcet/grafcet-utils";
import useCtrlWheelZoom from "@/ui/lib/hooks/useCtrlWheelZoom";
import { Box, SxProps, Theme } from "@mui/material";
import {
	Background,
	IsValidConnection,
	OnConnect,
	OnDelete,
	OnEdgesChange,
	OnInit,
	OnNodesChange,
	ReactFlow,
	ReactFlowProvider,
} from "@xyflow/react";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
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
import "@/ui/lib/react-flow/flow-page.css";
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
	overflow: "auto",
	background: (th) => th.palette.background.default,
	position: "relative",
};

const FIT_OUTER_CONTAINER_SX: SxProps<Theme> = {
	width: "100%",
	height: "100%",
	overflow: "hidden",
	background: (th) => th.palette.background.default,
	position: "relative",
};

const FIT_VIEW_OPTIONS = {
	padding: 0.05,
	minZoom: GRAFCET_FLOW_MIN_ZOOM,
	maxZoom: 1,
};

const FLOW_CONTAINER_SX: SxProps<Theme> = {
	border: "1px solid lightgray",
	backgroundClip: "content-box",
	//Automatic margins center the page and fall back to 0 when it is wider than the container:
	//it then overflows to the right, where the scrolling reaches.
	margin: "0 auto",
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

const FIT_FLOW_CONTAINER_SX: SxProps<Theme> = {
	...FLOW_CONTAINER_SX,
	border: "none",
	margin: 0,
	width: "100%",
	height: "100%",
};

export function GrafcetFlowContent({
	fitToContainer = false,
}: {
	fitToContainer?: boolean;
}) {
	const setActiveScope = useProjectStore((state) => state.setActiveScope);
	const [handleToolDragOver, handleToolDrop] = useToolDragOverHandlers();
	const {
		onPaneContextMenu,
		onNodeContextMenu,
		onEdgeContextMenu,
		closeContextMenu,
	} = useContextMenuOpeningHandlers();
	const { store } = useGrafcetContext();
	const grafcetId = useGrafcetStore((state) => state.grafcet.id);
	const nodes = useGrafcetStore(useShallow((state) => state.nodes));
	const edges = useGrafcetStore(useShallow((state) => state.edges));
	const viewManager = useGrafcetStore((state) => state.viewManager);
	const workflowManager = useGrafcetStore((state) => state.workflowManager);
	const [fitContainerSize, setFitContainerSize] = useState<{
		width: number;
		height: number;
	} | null>(null);
	const canEdit = useCanEdit();
	const editingEnabled = usePageEditingEnabled(grafcetId);
	//A block where the grafcet can be edited shows the page at its real size, scrolling like the
	//page of the application; otherwise the grafcet is fitted to the block.
	const fitContent = fitToContainer && !editingEnabled;
	const zoom = useGrafcetStore((state) => state.zoom) ?? 1;
	const flowDimensions = useMemo(
		() =>
			fitContent
				? (fitContainerSize ?? GRAFCET_PAGE_DIMENSIONS)
				: {
						width: GRAFCET_PAGE_DIMENSIONS.width * zoom,
						height: GRAFCET_PAGE_DIMENSIONS.height * zoom,
					},
		[fitContent, fitContainerSize, zoom],
	);

	const [containerElement, setContainerElementState] =
		useState<HTMLElement | null>(null);
	const pageRef = useRef<HTMLElement | null>(null);
	const setContainerElement = useCallback(
		(el: HTMLElement | null) => {
			pageRef.current = el;
			viewManager.setContainerElement(el);
			setContainerElementState(el);
		},
		[viewManager],
	);
	useCtrlWheelZoom(pageRef, (direction) =>
		direction > 0 ? viewManager.zoomIn() : viewManager.zoomOut(),
	);

	useEffect(() => {
		viewManager.setMinZoom(GRAFCET_FLOW_MIN_ZOOM);
	}, [viewManager]);
	const handleViewportChange = useCallback(
		({ zoom }: { zoom: number }) => viewManager.setZoom(zoom),
		[viewManager],
	);

	useEffect(() => {
		if (!fitToContainer || !containerElement) return;
		const observer = new ResizeObserver(([entry]) => {
			const { width, height } = entry.contentRect;
			if (width === 0 || height === 0) return;
			setFitContainerSize({ width, height });
			if (fitContent) void viewManager.rfInstance?.fitView(FIT_VIEW_OPTIONS);
		});
		observer.observe(containerElement);
		return () => observer.disconnect();
	}, [fitToContainer, fitContent, containerElement, viewManager]);

	//The viewport of a page shown at its real size stays at the origin: the zoom only resizes it.
	useEffect(() => {
		viewManager.setViewportPinned(!fitContent);
		viewManager.pinViewport();
	}, [viewManager, fitContent]);

	//A block opens on the whole page width.
	const fitContainerWidth = fitContainerSize?.width;
	useEffect(() => {
		if (!fitToContainer || fitContent || fitContainerWidth === undefined)
			return;
		viewManager.applyZoom(
			getPageFitZoom(fitContainerWidth, GRAFCET_FLOW_MIN_ZOOM),
		);
	}, [fitToContainer, fitContent, fitContainerWidth, viewManager]);

	const handleInit = useCallback<OnInit<GrafcetNodeType, GrafcetEdgeType>>(
		(instance) => {
			viewManager.setReactFlowInstance(instance as any);
			viewManager.setViewportPinned(!fitContent);
			viewManager.pinViewport();
		},
		[viewManager, fitContent],
	);
	const handleMoveEnd = useCallback(
		(_: unknown, viewport: { x: number; y: number; zoom: number }) =>
			viewManager.syncFromInstance(viewport),
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
			[GRAFCET_PAGE_DIMENSIONS.width - 2, GRAFCET_PAGE_DIMENSIONS.height - 2],
		],
		[],
	);
	const flowContainerSx = useMemo<SxProps<Theme>>(
		() =>
			fitContent
				? FIT_FLOW_CONTAINER_SX
				: {
						...FLOW_CONTAINER_SX,
						width: flowDimensions.width + "px",
						height: flowDimensions.height + "px",
					},
		[fitContent, flowDimensions],
	);

	return (
		<Box
			className={`grafcet-page flow-page${canEdit ? "" : " flow-page--readonly"}`}
			id={`grafcet-${grafcetId}`}
			ref={setContainerElement}
			sx={fitContent ? FIT_OUTER_CONTAINER_SX : OUTER_CONTAINER_SX}
		>
			<Box sx={flowContainerSx}>
				<ReactFlow
					nodes={nodes}
					edges={edges}
					onInit={handleInit}
					nodesDraggable={canEdit}
					nodesConnectable={canEdit}
					elementsSelectable={canEdit}
					onNodesChange={handleNodesChange}
					onConnect={handleConnect}
					onEdgesChange={handleEdgesChange}
					onDelete={handleDelete}
					fitView={fitContent}
					fitViewOptions={FIT_VIEW_OPTIONS}
					nodeTypes={nodeTypes}
					edgeTypes={edgeTypes}
					defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
					connectionLineComponent={GrafcetConnectionLine}
					isValidConnection={isValidConnection}
					minZoom={GRAFCET_FLOW_MIN_ZOOM}
					maxZoom={GRAFCET_FLOW_MAX_ZOOM}
					snapToGrid={true}
					selectionOnDrag={true}
					panOnDrag={fitContent}
					snapGrid={SNAP_GRID}
					translateExtent={fitContent ? undefined : extent}
					nodeExtent={extent}
					onDragOver={handleToolDragOver}
					onDrop={handleToolDrop}
					tabIndex={0} //This attribute is necessary so that the flow can be focused with the mouse click
					onFocus={handleFocus}
					onPaneContextMenu={onPaneContextMenu as any}
					onNodeContextMenu={onNodeContextMenu}
					onEdgeContextMenu={onEdgeContextMenu}
					onPaneClick={closeContextMenu}
					onNodeClick={closeContextMenu}
					onEdgeClick={closeContextMenu}
					onViewportChange={handleViewportChange}
					onMoveStart={closeContextMenu}
					onMoveEnd={handleMoveEnd}
					onNodeDragStart={closeContextMenu}
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

export default function GrafcetFlow({
	fitToContainer = false,
}: {
	fitToContainer?: boolean;
}) {
	return (
		<ReactFlowProvider>
			<GrafcetFlowContent fitToContainer={fitToContainer} />
		</ReactFlowProvider>
	);
}
