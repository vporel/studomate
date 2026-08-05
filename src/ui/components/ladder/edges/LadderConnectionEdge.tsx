"use client";

import ConnectionUpdateCommand from "@/schemas/ladder/commands/connection-update.command";
import { EDGE_INTERACTION_WIDTH } from "@/ui/constants";
import { getStraightPathFromPoints } from "@/ui/lib/svg";
import { CELL_SUBDIVISIONS } from "@/ui/utils/ladder/ladder-connection-path";
import { getConnectionLinePoints, GRID_CELL_WIDTH, POWER_RAIL_OFFSET } from "@/ui/utils/ladder/ladder-flow-builder";
import { Box } from "@mui/material";
import { Edge, EdgeProps, useReactFlow } from "@xyflow/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useLadderStore } from "../context/LadderContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useShallow } from "zustand/react/shallow";
import { computeEnergizedEdges } from "@/ui/utils/ladder/ladder-power-flow";
import { useTheme } from "@mui/material";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";

export type LadderConnectionEdgeData = { points: [number, number][] };
export type LadderConnectionEdgeType = Edge<LadderConnectionEdgeData> & { type: "ladder-connection" };

/** Largeur d'une subdivision de colonne (voir `CELL_SUBDIVISIONS`, `ladder-connection-path.ts`)
 * — le pas de déplacement d'un coude, souris comme clavier. */
const QUARTER_CELL_WIDTH = GRID_CELL_WIDTH / CELL_SUBDIVISIONS;

/** `data.points` est en quarts de cellule de grille (voir `ladder-connection-path.ts`) —
 * conversion en pixels pour le rendu, symétrique de `POWER_RAIL_OFFSET + col*GRID_CELL_WIDTH`
 * côté nœuds. */
const quarterColToPx = (quarterCol: number) => POWER_RAIL_OFFSET + quarterCol * QUARTER_CELL_WIDTH;

type Vertex = [number, number];

/**
 * `[source, ...points, target]`, en pixels — pas de recours à `getSmoothStepPath` : `points`
 * peut désormais porter jusqu'à 3 segments (stub après la source, vertical, stub avant la
 * cible), une forme que la lib ne sait pas produire nativement. `points` ne contient jamais la
 * ligne de la source/cible elles-mêmes (toujours celle, actuelle, de `sourceY`/`targetY`) — voir
 * le même principe côté domaine dans `computeConnectionSegments`.
 */
function buildVertices(sourceX: number, sourceY: number, targetX: number, targetY: number, points: [number, number][]): Vertex[] {
	if (sourceY === targetY) return [[sourceX, sourceY], [targetX, targetY]];
	if (points.length === 0) return getConnectionLinePoints(sourceX, sourceY, targetX, targetY);
	const bend: Vertex[] = points.map(([, quarterCol], i) => [quarterColToPx(quarterCol), i === 0 ? sourceY : targetY]);
	return [[sourceX, sourceY], ...bend, [targetX, targetY]];
}

/** Le segment vertical du tracé, s'il y en a un — le seul déplaçable (voir la conception : un
 * nœud pousse ses propres connexions, l'utilisateur ne peut que déplacer ce segment lui-même). */
function findVerticalSegment(vertices: Vertex[]): { x: number; yA: number; yB: number } | null {
	for (let i = 0; i < vertices.length - 1; i++) {
		const [xA, yA] = vertices[i];
		const [xB, yB] = vertices[i + 1];
		if (xA === xB && yA !== yB) return { x: xA, yA, yB };
	}
	return null;
}

const LadderConnectionEdge = ({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	data,
	selected,
	interactionWidth = EDGE_INTERACTION_WIDTH,
}: EdgeProps<LadderConnectionEdgeType>) => {
	const { screenToFlowPosition } = useReactFlow();
	const th = useTheme();
	const commandsStackManager = useLadderStore((state) => state.commandsStackManager);
	const ladder = useLadderStore((state) => state.ladder);
	const mode = useProjectStore((state) => state.mode);
	const energized = useProjectStore(
		useShallow((state) => {
			if (!ladder || state.mode !== ProjectMode.SIMULATION) return false;
			return computeEnergizedEdges(ladder, state.simulationVariablesStates).has(id);
		})
	);
	const points = useMemo(() => data?.points ?? [], [data]);

	// État local pendant le geste, comme le glisser d'un nœud : le domaine (donc `points`) n'est
	// mis à jour qu'au relâchement, une seule commande.
	const [liveQuarterCol, setLiveQuarterCol] = useState<number | null>(null);
	// Miroir de `liveQuarterCol` lu au relâchement : dispatcher la commande depuis un updater
	// `setState` (plutôt que depuis un ref) mettrait à jour le store pendant la phase de rendu de
	// ce composant, ce que React refuse ("Cannot update a component while rendering a different
	// component").
	const liveQuarterColRef = useRef<number | null>(null);

	const vertices = buildVertices(sourceX, sourceY, targetX, targetY, points);
	const verticalSegment = findVerticalSegment(vertices);
	const renderedVertices =
		liveQuarterCol !== null && verticalSegment
			? vertices.map(([x, y]) => (x === verticalSegment.x ? [quarterColToPx(liveQuarterCol), y] : [x, y]) as Vertex)
			: vertices;
	const path = getStraightPathFromPoints(renderedVertices);

	const handlePointerDown = useCallback((e: React.PointerEvent<SVGLineElement>) => {
		e.stopPropagation();
		(e.target as SVGLineElement).setPointerCapture(e.pointerId);
	}, []);

	const handlePointerMove = useCallback(
		(e: React.PointerEvent<SVGLineElement>) => {
			if (e.buttons !== 1) return;
			const { x } = screenToFlowPosition({ x: e.clientX, y: e.clientY });
			// Claque sur les quarts de colonne (voir `CELL_SUBDIVISIONS`) — la résolution de
			// déplacement d'un coude, souris comme clavier.
			const snappedQuarterCol = Math.round((x - POWER_RAIL_OFFSET) / QUARTER_CELL_WIDTH);
			liveQuarterColRef.current = snappedQuarterCol;
			setLiveQuarterCol(snappedQuarterCol);
		},
		[screenToFlowPosition],
	);

	const handlePointerUp = useCallback(
		(e: React.PointerEvent<SVGLineElement>) => {
			(e.target as SVGLineElement).releasePointerCapture(e.pointerId);
			const finalQuarterCol = liveQuarterColRef.current;
			liveQuarterColRef.current = null;
			setLiveQuarterCol(null);
			if (finalQuarterCol === null) return;
			const newPoints: [number, number][] = points.map(([row]) => [row, finalQuarterCol]);
			if (JSON.stringify(newPoints) !== JSON.stringify(points)) {
				commandsStackManager.executeOperation([
					new ConnectionUpdateCommand({
						connectionId: id,
						changes: { points: newPoints },
						previousChanges: { points: points.map(([row, col]) => [row, col]) },
					}),
				]);
			}
		},
		[points, id, commandsStackManager],
	);

	return (
		<Box
			component="g"
			sx={{
				pointerEvents: mode === ProjectMode.DESIGN ? "all" : "none",
				".ladder-edge-point": { opacity: 0 },
				"&:hover .ladder-edge-point": { opacity: mode === ProjectMode.DESIGN ? 1 : 0 },
			}}
		>
			<path 
				d={path} 
				fill="none" 
				className="react-flow__edge-path" 
				style={energized ? { stroke: th.palette.energized.main, strokeWidth: 2 } : undefined}
			/>
			{interactionWidth ? (
				<path
					d={path}
					fill="none"
					strokeOpacity={0}
					strokeWidth={interactionWidth}
					className="react-flow__edge-interaction"
				/>
			) : null}
			<circle className="ladder-edge-point" cx={sourceX} cy={sourceY} r={3} fill="black" />
			<circle className="ladder-edge-point" cx={targetX} cy={targetY} r={3} fill="black" />
			{selected && verticalSegment && (
				<line
					x1={liveQuarterCol !== null ? quarterColToPx(liveQuarterCol) : verticalSegment.x}
					x2={liveQuarterCol !== null ? quarterColToPx(liveQuarterCol) : verticalSegment.x}
					y1={verticalSegment.yA}
					y2={verticalSegment.yB}
					stroke="transparent"
					strokeWidth={EDGE_INTERACTION_WIDTH}
					style={{ cursor: "ew-resize" }}
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUp}
				/>
			)}
		</Box>
	);
};

export default LadderConnectionEdge;
