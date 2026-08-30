"use client";

import { isConnectionAllowed } from "@/schemas/ladder/commands/connections-add.command";
import Section from "@/schemas/ladder/section.schema";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import {
	LADDER_FLOW_MAX_ZOOM,
	LADDER_FLOW_MIN_ZOOM,
	ZoomableInstance,
} from "@/ui/stores/ladder/managers/view.manager";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import {
	computeSectionLayout,
	GRID_CELL_HEIGHT,
	GRID_CELL_WIDTH,
	LADDER_FLOW_TOP_OFFSET,
	parseVirtualRailRow,
	RAIL_LANE_WIDTH,
} from "@/ui/utils/ladder/ladder-flow-builder";
import { computeLadderFlowDimensions } from "@/ui/utils/ladder/ladder-flow-dimensions";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Box, Collapse, SxProps, Theme } from "@mui/material";
import {
	EdgeChange,
	IsValidConnection,
	NodeChange,
	OnMove,
	ReactFlow,
	Viewport,
} from "@xyflow/react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import EMPTY_ARRAY from "@/ui/lib/empty";
import { useLadderStore } from "../context/LadderContext";
import LadderConnectionLine from "../edges/LadderConnectionLine";
import LadderSectionDescription from "./LadderSectionDescription";
import LadderSectionHeader from "./LadderSectionHeader";
import {
	edgeTypes,
	LadderNodeType,
	nodeTypes,
} from "./ladder-nodes-definitions";
import useLadderConnectHandler from "./useLadderConnectHandler";
import useLadderConnectionKeyboardHandler from "./useLadderConnectionKeyboardHandler";
import useLadderNodeMoveKeyboardHandler from "./useLadderNodeMoveKeyboardHandler";
import useLadderContextMenu from "./useLadderContextMenu";
import useLadderDeleteHandler from "./useLadderDeleteHandler";
import useLadderDropHandlers from "./useLadderDropHandlers";
import LadderContextMenu from "../context-menu/LadderContextMenu";

import "@xyflow/react/dist/style.css";

interface LadderSectionProps {
	section: Section;
	/** Position dans `ladder.sections` — voir `LadderSectionHeader`. */
	index: number;
}

const FLOW_MARGIN = 10;

const SECTION_FLOW_SX: SxProps<Theme> = {
	width: "100%",
	height: "100%",
	// Fond CSS : aligné au pixel près sur la grille (60×45).
	// Le <Background> de ReactFlow a un offset interne non contrôlable ;
	// le CSS backgroundSize garantit un alignement parfait puisque
	// le viewport est fixe à (0,0) (pas de pan/zoom).
	backgroundColor: "white",
	backgroundImage: `radial-gradient(circle at 0 0, rgba(0,0,0,0.45) 1.5px, transparent 1.5px)`,
	backgroundSize: `${GRID_CELL_WIDTH}px ${GRID_CELL_HEIGHT}px`,
	// Décalé de RAIL_LANE_WIDTH en x (colonne 0 des éléments, voir POWER_RAIL_OFFSET)
	// et de LADDER_FLOW_TOP_OFFSET en y (ligne 0 des éléments) — ce dernier n'étant
	// plus un multiple exact de GRID_CELL_HEIGHT, la périodicité du motif ne suffit
	// plus à garder les points alignés sur les lignes réelles, il faut ce recalage
	// explicite.
	backgroundPosition: `${RAIL_LANE_WIDTH}px ${LADDER_FLOW_TOP_OFFSET}px`,
	borderLeft: "2px solid black",
	".react-flow__pane": { cursor: "default" },
	".react-flow__renderer": { background: "transparent" },
	// strokeLinecap "round" : deux éléments adjacents (le cas le plus courant) ont
	// leurs bornes exactement superposées (voir `LadderConnectionEdge`, offset: 0),
	// donc un tracé de longueur nulle — sans arrondi, un tel tracé ne peint et
	// n'intercepte RIEN (linecap "butt" par défaut), rendant la connexion à la
	// fois invisible et impossible à sélectionner. L'arrondi la fait peindre (et
	// intercepter les clics) comme un point, y compris à longueur nulle.
	".react-flow__edge-path": {
		stroke: "black",
		strokeWidth: 1.5,
		strokeLinecap: "round",
	},
	".react-flow__edge-interaction": { strokeLinecap: "round" },
	".react-flow__edge.selected .react-flow__edge-path, .react-flow__edge.selectable:focus .react-flow__edge-path":
		{ stroke: (th: Theme) => th.palette.primary.main },
};

function LadderSection({ section, index }: LadderSectionProps) {
	const viewManager = useLadderStore((state) => state.viewManager);
	const zoom = useLadderStore((state) => state.zoomBySectionId[section.id] ?? 1);
	const workflowManager = useLadderStore((state) => state.workflowManager);
	const nodes = useLadderStore(
		(state) => state.nodesBySectionId[section.id] ?? EMPTY_ARRAY,
	);
	const edges = useLadderStore(
		(state) => state.edgesBySectionId[section.id] ?? EMPTY_ARRAY,
	);
	const mode = useProjectStore((state) => state.mode);
	const [collapsed, setCollapsed] = useState(false);
	const hasHighlightedNode = useLadderStore((state) =>
		(state.highlightedNodesIds ?? EMPTY_ARRAY).some(
			(id) => section.getElement(id) !== undefined,
		),
	);
	const setActiveSectionId = useLadderStore(
		(state) => state.setActiveSectionId,
	);

	useEffect(() => {
		if (hasHighlightedNode) {
			setCollapsed(false);
		}
	}, [hasHighlightedNode]);

	useEffect(
		() => () => viewManager.unregisterInstance(section.id),
		[viewManager, section.id],
	);

	// React Flow appelle `preventDefault` sur toute molette au-dessus de son pane, ce qui
	// bloque le défilement de la page. On n'autorise ce comportement que pour le geste de
	// zoom (Cmd/Ctrl enfoncé) ; sinon on arrête l'évènement en phase de capture, avant le
	// listener de d3-zoom, pour qu'il remonte à la page comme un scroll normal.
	// Ref-callback (et non useEffect) : le listener est (dé)branché exactement au moment où
	// le nœud DOM apparaît/disparaît, sans dépendre de l'ordre de commit.
	const detachWheelGuard = useRef<(() => void) | null>(null);
	const flowWrapperRef = useCallback((node: HTMLDivElement | null) => {
		detachWheelGuard.current?.();
		detachWheelGuard.current = null;
		if (!node) return;
		const stopPlainWheel = (event: WheelEvent) => {
			if (!event.ctrlKey && !event.metaKey) event.stopPropagation();
		};
		node.addEventListener("wheel", stopPlainWheel, { capture: true });
		detachWheelGuard.current = () =>
			node.removeEventListener("wheel", stopPlainWheel, { capture: true });
	}, []);
	const handleInit = useCallback(
		(instance: ZoomableInstance) => {
			viewManager.registerInstance(section.id, instance);
			// À l'initialisation, React Flow peut mesurer son conteneur avant qu'il ait sa taille
			// finale (ex. juste après le montage, hors de toute interaction) et rester avec un
			// viewport interne incohérent — un simple zoom manuel (donc un `setViewport`) suffit à
			// corriger l'affichage, on le déclenche donc nous-mêmes une fois prêt.
			viewManager.resetViewport(section.id);
		},
		[viewManager, section.id],
	);

	const { totalRows, leafPositions } = useMemo(
		() => computeSectionLayout(section),
		[section],
	);
	const flowDimensions = useMemo(
		() => computeLadderFlowDimensions(totalRows),
		[totalRows],
	);

	const [handleDragOver, handleDrop] = useLadderDropHandlers(
		section,
		leafPositions,
	);
	const handleNodesChange = useCallback(
		(changes: NodeChange<LadderNodeType>[]) =>
			workflowManager.handleNodesChange(section.id, changes),
		[workflowManager, section.id],
	);
	const handleEdgesChange = useCallback(
		(changes: EdgeChange[]) =>
			workflowManager.handleEdgesChange(section.id, changes),
		[workflowManager, section.id],
	);
	const handleConnect = useLadderConnectHandler(section);
	const handleDelete = useLadderDeleteHandler(section);
	const handleConnectionKeyDown = useLadderConnectionKeyboardHandler(edges);
	const handleNodeMoveKeyDown = useLadderNodeMoveKeyboardHandler(
		section.id,
		nodes,
	);
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			handleConnectionKeyDown(e);
			handleNodeMoveKeyDown(e);
		},
		[handleConnectionKeyDown, handleNodeMoveKeyDown],
	);
	const handleMoveEnd = useCallback<OnMove>(
		(_, viewport) => viewManager.syncFromInstance(section.id, viewport.zoom),
		[viewManager, section.id],
	);
	const isValidConnection = useCallback<IsValidConnection>(
		(connection) => {
			// Depuis une borne d'alimentation virtuelle (ligne sans borne réelle) : seule
			// l'existence et la nature de la cible comptent, la borne sera matérialisée à
			// la connexion (voir useLadderConnectHandler) — pas encore dans le schéma pour
			// qu'isConnectionAllowed puisse la trouver.
			if (parseVirtualRailRow(connection.source) !== null) {
				const target = section.getElement(connection.target);
				return !!target && target.type !== "railTerminal";
			}
			return isConnectionAllowed(section, connection.source, connection.target);
		},
		[section],
	);
	const extent = useMemo<[[number, number], [number, number]]>(
		() => [
			[0, 0],
			[flowDimensions.width - 2, flowDimensions.height - 2],
		],
		[flowDimensions],
	);
	const defaultViewport = useMemo<Viewport>(
		() => ({ x: 0, y: 0, zoom }),
		[zoom],
	);
	const {
		openNodeContextMenu,
		openEdgeContextMenu,
		openPaneContextMenu,
		closeContextMenu,
	} = useLadderContextMenu(section, mode);

	const {
		setNodeRef,
		attributes,
		listeners,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: section.id,
	});

	return (
		<Box
			ref={setNodeRef}
			data-section-id={section.id}
			onPointerDownCapture={() => setActiveSectionId(section.id)}
			sx={{
				width:
					flowDimensions.width + (FLOW_MARGIN * 2 + RAIL_LANE_WIDTH * 2) + "px",
				marginLeft: "50%",
				// translate(-50%, 0) centre la section ; le déplacement dnd-kit (CSS.Transform) se
				// compose par-dessus, sinon il écraserait le centrage.
				transform: [`translate(-50%, 0)`, CSS.Transform.toString(transform)]
					.filter(Boolean)
					.join(" "),
				transition,
				marginBottom: "16px",
				opacity: isDragging ? 0.5 : 1,
				zIndex: isDragging ? 1 : "auto",
			}}
		>
			<LadderSectionHeader
				section={section}
				index={index}
				collapsed={collapsed}
				onToggleCollapse={() => setCollapsed((c) => !c)}
				dragHandleAttributes={attributes}
				dragHandleListeners={listeners}
			/>

			{/* ── Contenu repliable : description puis ReactFlow de la section ── */}
			<Collapse
				in={!collapsed}
				unmountOnExit={false}
				sx={{ background: "white" }}
			>
				<LadderSectionDescription section={section} />
				<Box
					sx={{
						width: "100%",
						height: flowDimensions.height + FLOW_MARGIN * 2 + "px",
						backgroundColor: "white",
						pl: FLOW_MARGIN + "px",
						pr: FLOW_MARGIN + "px",
						py: 1,
					}}
				>
					<Box
						ref={flowWrapperRef}
						onKeyDown={handleKeyDown}
						sx={SECTION_FLOW_SX}
					>
						<ReactFlow
							nodes={nodes}
							edges={edges}
							nodeTypes={nodeTypes}
							// Le déplacement des nœuds aux flèches est fait par
							// `useLadderNodeMoveKeyboardHandler` (grille row/col propre au Ladder) —
							// celui, en pixels, de React Flow est désactivé pour éviter le double
							// traitement. `onDelete` (Suppr/Backspace) n'en dépend pas.
							disableKeyboardA11y
							edgeTypes={edgeTypes}
							nodesDraggable={mode === ProjectMode.DESIGN}
							nodesConnectable={mode === ProjectMode.DESIGN}
							elementsSelectable={mode === ProjectMode.DESIGN}
							onNodesChange={handleNodesChange}
							onEdgesChange={handleEdgesChange}
							onConnect={handleConnect}
							connectionLineComponent={LadderConnectionLine}
							isValidConnection={isValidConnection}
							onDelete={handleDelete}
							onNodeContextMenu={openNodeContextMenu}
							onEdgeContextMenu={openEdgeContextMenu}
							onPaneClick={closeContextMenu}
							onPaneContextMenu={openPaneContextMenu}
							onMoveStart={closeContextMenu}
							onMoveEnd={handleMoveEnd}
							onInit={handleInit}
							panOnDrag={false}
							// Le viewport du Ladder est verrouillé à (0,0) (voir `LadderViewManager`) :
							// laisser React Flow faire défiler le viewport quand un glisser de nœud
							// approche un bord décalerait tout le contenu (dont les stubs de rail) par
							// rapport à la barre CSS statique du rail, sans jamais revenir à zéro.
							autoPanOnNodeDrag={false}
							selectionOnDrag={true}
							// Pas de snapToGrid/snapGrid natif : ses multiples partent de l'origine (0,0),
							// incompatibles avec le décalage de POWER_RAIL_OFFSET sur les colonnes réelles
							// (10, 70, 130, ...) — l'accrochage à la grille est fait nous-mêmes, à chaque
							// frame, dans `LadderWorkflowManager.snapPositionChange`.
							panOnScroll={false}
							zoomOnScroll={false}
							zoomOnPinch={false}
							zoomOnDoubleClick={false}
							minZoom={LADDER_FLOW_MIN_ZOOM}
							maxZoom={LADDER_FLOW_MAX_ZOOM}
							translateExtent={extent}
							nodeExtent={extent}
							defaultViewport={defaultViewport}
							fitView={false}
							onDragOver={handleDragOver}
							onDrop={handleDrop}
						>
							<LadderContextMenu
								flowDimensions={flowDimensions}
								sectionId={section.id}
								handleDelete={handleDelete}
							/>
						</ReactFlow>
					</Box>
				</Box>
			</Collapse>
		</Box>
	);
}

export default memo(LadderSection);
