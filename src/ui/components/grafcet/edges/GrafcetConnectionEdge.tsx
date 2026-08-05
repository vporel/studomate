import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { EDGE_INTERACTION_WIDTH } from "@/ui/constants";
import { getStraightPathFromPoints } from "@/ui/lib/svg";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { getConnectionLinePoints } from "@/ui/utils/grafcet/grafcet-utils";
import { Box, useTheme } from "@mui/material";
import { Edge, type EdgeProps } from "@xyflow/react";
import { useEffect, useState } from "react";
import useAddPointHandler from "./useAddPointHandler";
import usePointPointerEventsHandlers from "./usePointPointerEventsHandlers";

export type GrafcetConnectionEdgeData = { points: [number, number][] };

export type GrafcetConnectionEdgeType = Edge<GrafcetConnectionEdgeData> & { type: "grafcet-connection" };

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
	const [points, setPoints] = useState<[number, number][]>(
		data?.points ?? getConnectionLinePoints(sourceX, sourceY, targetX, targetY),
	);
	const pathString = getStraightPathFromPoints(
		points.length > 0 ? points : getConnectionLinePoints(sourceX, sourceY, targetX, targetY),
	);
	const color = !selected ? "black" : th.palette.primary.main;
	const { pointsForAdding, setPointsForAdding, addPoint } = useAddPointHandler(points, id);
	const { handlePointPointerDown, handlePointPointerMove, handlePointPointerUp } =
		usePointPointerEventsHandlers(points, setPoints, setPointsForAdding, id);
	const projectMode = useProjectStore((state) => state.mode);

	//Update the points when the source position changes
	useEffect(() => {
		setPoints((prevPoints) => {
			const newPoints = [...prevPoints];
			newPoints.splice(0, 1, [sourceX, sourceY]);
			newPoints.splice(newPoints.length - 1, newPoints.length, [targetX, targetY]);
			return newPoints;
		});
	}, [sourceX, sourceY, targetX, targetY]);

	useEffect(() => {
		if (!data || !data.points) return;
		setPoints(data.points);
	}, [data]);

	return (
		<Box
			component="g"
			sx={{
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
			}}
		>
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
			{points.map(
				(p, index) =>
					index != 0 &&
					index != points.length - 1 && (
						<g key={index}>
							<circle
								className="react-flow__edge-path__point"
								key={index}
								cx={p[0]}
								cy={p[1]}
								r={3}
								fill={color}
								stroke={color}
								strokeWidth={1.5}
							/>
							<circle
								className="react-flow__edge-path__point"
								cx={p[0]}
								cy={p[1]}
								r={6}
								fill="transparent"
								onPointerDown={(e) => handlePointPointerDown(e, index)}
								onPointerMove={(e) => handlePointPointerMove(e, index)}
								onPointerUp={(e) => handlePointPointerUp(e, index)}
							/>
						</g>
					),
			)}
			{pointsForAdding.map((p, index) => (
				<g key={index}>
					<circle
						className="react-flow__edge-path__point"
						cx={p[0]}
						cy={p[1]}
						r={3}
						fill="#fff"
						stroke={color}
						strokeWidth={1.5}
					/>
					<circle
						className="react-flow__edge-path__point"
						cx={p[0]}
						cy={p[1]}
						r={6}
						fill="transparent"
						onClick={() => addPoint(index)}
					/>
				</g>
			))}
		</Box>
	);
};

export default GrafcetConnectionEdge;
