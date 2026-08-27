import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { EDGE_INTERACTION_WIDTH } from "@/ui/constants";
import { getStraightPathFromPoints } from "@/ui/lib/svg";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { getConnectionLinePoints } from "@/ui/utils/grafcet/grafcet-utils";
import { Box, SxProps, Theme, useTheme } from "@mui/material";
import { Edge, type EdgeProps } from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";
import GrafcetConnectionEdgePoint from "./GrafcetConnectionEdgePoint";
import useAddPointHandler from "./useAddPointHandler";
import usePointPointerEventsHandlers from "./usePointPointerEventsHandlers";

export type GrafcetConnectionEdgeData = { points: [number, number][] };

export type GrafcetConnectionEdgeType = Edge<GrafcetConnectionEdgeData> & {
	type: "grafcet-connection";
};

const samePoints = (a: [number, number][], b: [number, number][]) =>
	a.length === b.length &&
	a.every((p, i) => p[0] === b[i][0] && p[1] === b[i][1]);

const GrafcetConnectionEdge = ({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	data,
	interactionWidth = EDGE_INTERACTION_WIDTH,
	selected,
}: EdgeProps<GrafcetConnectionEdgeType>) => {
	const th = useTheme();
	// `data.points` ne porte que les coudes intermédiaires (coordonnées flow). Les extrémités
	// sont toujours celles, live, des handles (`sourceX/Y`, `targetX/Y`) — jamais stockées.
	// Même modèle que `LadderConnectionEdge`. L'état local ne sert qu'au geste de déplacement
	// d'un coude, committé dans le domaine au relâchement.
	const [points, setPoints] = useState<[number, number][]>(data?.points ?? []);
	const vertices = useMemo(
		() =>
			points.length > 0
				? ([[sourceX, sourceY], ...points, [targetX, targetY]] as [
						number,
						number,
					][])
				: getConnectionLinePoints(sourceX, sourceY, targetX, targetY),
		[points, sourceX, sourceY, targetX, targetY],
	);
	const pathString = useMemo(
		() => getStraightPathFromPoints(vertices),
		[vertices],
	);
	const color = useMemo(
		() => (!selected ? "black" : th.palette.primary.main),
		[selected, th],
	);
	const { pointsForAdding, addPoint } = useAddPointHandler(vertices, id);
	const {
		handlePointPointerDown,
		handlePointPointerMove,
		handlePointPointerUp,
	} = usePointPointerEventsHandlers(points, setPoints, id);
	const projectMode = useProjectStore((state) => state.mode);

	useEffect(() => {
		if (!data || !data.points) return;
		setPoints((prev) => (samePoints(prev, data.points) ? prev : data.points));
	}, [data]);

	const containerSx = useMemo<SxProps<Theme>>(
		() => ({
			pointerEvents: "all",
			".react-flow__edge-path__point": {
				visibility: "hidden",
				opacity: 0,
			},
			"&:hover":
				projectMode === ProjectMode.DESIGN
					? {
							".react-flow__edge-path__point": {
								visibility: "visible",
								opacity: 1,
							},
						}
					: {},
		}),
		[projectMode],
	);

	return (
		<Box component="g" sx={containerSx}>
			<path d={pathString} fill="none" className={`react-flow__edge-path `} />
			{interactionWidth ? (
				<path
					d={pathString}
					fill="none"
					strokeOpacity={0}
					strokeWidth={interactionWidth}
					className="react-flow__edge-interaction"
				/>
			) : null}
			{points.map((p, index) => (
				<GrafcetConnectionEdgePoint
					key={`move-${index}`}
					index={index}
					x={p[0]}
					y={p[1]}
					color={color}
					mode="move"
					onPointerDown={handlePointPointerDown}
					onPointerMove={handlePointPointerMove}
					onPointerUp={handlePointPointerUp}
				/>
			))}
			{pointsForAdding.map((p, index) => (
				<GrafcetConnectionEdgePoint
					key={`add-${index}`}
					index={index}
					x={p[0]}
					y={p[1]}
					color={color}
					mode="add"
					onAdd={addPoint}
				/>
			))}
		</Box>
	);
};

export default GrafcetConnectionEdge;
