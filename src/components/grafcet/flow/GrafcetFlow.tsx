"use client";
import { useProjectStore } from "@/components/projects/ProjectContext";
import { FLOW_GRID_CELL_WIDTH } from "@/constants";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import { getFlowDimensions } from "@/utils/grafcet/grafcet-utils";
import { Box, useTheme } from "@mui/material";
import { Background, Connection, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import { useShallow } from "zustand/shallow";
import CustomConnectionLine from "../connections-lines/CustomConnectionLine";
import GrafcetContextMenu from "../context-menu/GrafcetContextMenu";
import { GrafcetContextProvider, useGrafcetStore } from "../context/GrafcetContext";
import "./_grafcet-page.css";
import { edgeTypes, nodeTypes, validateConnection } from "./grafcet-nodes-definitions";
import useContextMenuOpeningHandlers from "./useContextMenuOpeningHandlers";
import useEdgesHandlers from "./useEdgesHandlers";
import useNodesHandlers from "./useNodesHandlers";
import useShortcutsHandler from "./useShortcutsHandler";
import useToolDragOverHandlers from "./useToolDragOverHandlers";

export function GrafcetFlowContent() {
	const th = useTheme();
	const { setActiveScope } = useProjectStore(
		useShallow((state) => ({
			setActiveScope: state.setActiveScope,
		})),
	);
	const { onNodesDelete } = useNodesHandlers();
	const { onConnect, onEdgesDelete } = useEdgesHandlers();
	const [handleToolDragOver, handleToolDrop] = useToolDragOverHandlers();
	const handleShortcuts = useShortcutsHandler();
	const { onPaneContextMenu, onNodeContextMenu, onEdgeContextMenu } = useContextMenuOpeningHandlers();
	// const { store } = useGrafcetContext();
	const grafcetId = useGrafcetStore((state) => state.grafcet.id);
	const grafcetFormat = useGrafcetStore((state) => state.grafcet.format);
	const nodes = useGrafcetStore(useShallow((state) => state.nodes));
	const edges = useGrafcetStore(useShallow((state) => state.edges));
	const { setReactFlowInstance, onNodesChange } = useGrafcetStore(
		useShallow((state) => ({
			setReactFlowInstance: state.setReactFlowInstance,
			onNodesChange: state.onNodesChange,
		})),
	);
	const flowDimensions = useMemo(() => getFlowDimensions(grafcetFormat), [grafcetFormat]);

	//Share the grafcet data

	// useEffect(() => {
	// 	store?.subscribe((state) => {
	// 		updatePageData(state.grafcet.id, {
	// 			nodes: (state.rfInstance?.getNodes() || []) as GrafcetNode[],
	// 			edges: (state.rfInstance?.getEdges() || []) as GrafcetEdge[],
	// 		});
	// 	});
	// }, [store, updatePageData]);

	//Context menu actions

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
					onInit={setReactFlowInstance as any}
					onNodesChange={onNodesChange}
					onNodesDelete={onNodesDelete}
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
