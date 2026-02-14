import { getStraightPathFromPoints } from "@/lib/svg";
import { Box, useTheme } from "@mui/material";
import { Edge, useReactFlow, type EdgeProps } from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";
import { getConnectionLinePoints } from "../connections-lines/CustomConnectionLine";
import useAddPointHandler from "./useAddPointHandler";
import useEdgeStateEventsInHandlers from "./useEdgeStateEventsInHandlers";
import usePointPointerEventsHandlers from "./usePointPointerEventsHandlers";

export type CustomEdgeData = { points: [number, number][] };

export type CustomEdgeType = Edge<CustomEdgeData> & { type: "custom-edge" };

const CustomEdge = ({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	data,
	interactionWidth,
	selected,
	source,
	sourceHandleId,
	target,
	targetHandleId,
}: EdgeProps<CustomEdgeType>) => {
	const th = useTheme();
	const { updateEdgeData, getInternalNode } = useReactFlow();
	const sourceNode = useMemo(() => getInternalNode(source), [source, getInternalNode]);
	const targetNode = useMemo(() => getInternalNode(target), [target, getInternalNode]);
	const [points, setPoints] = useState<[number, number][]>(
		data?.points ?? getConnectionLinePoints(sourceX, sourceY, targetX, targetY),
	);
	const pathString = getStraightPathFromPoints(points);
	const color = !selected ? "black" : th.palette.primary.main;
	const { pointsForAdding, setPointsForAdding, addPoint } = useAddPointHandler(points, setPoints, id);
	const { handlePointPointerDown, handlePointPointerMove, handlePointPointerUp } =
		usePointPointerEventsHandlers(points, setPoints, setPointsForAdding, id);

	//Update the points when the source position changes
	useEffect(() => {
		setPoints((pts) => {
			const newPoints = [...pts];
			newPoints.splice(0, 1, [sourceX, sourceY]);
			return newPoints;
		});
	}, [sourceX, sourceY]);

	//Update the points when the target position changes
	useEffect(() => {
		setPoints((pts) => {
			const newPoints = [...pts];
			newPoints.splice(newPoints.length - 1, newPoints.length, [targetX, targetY]);
			return newPoints;
		});
	}, [targetX, targetY]);

	//Update the edge data when the points changes
	useEffect(() => {
		updateEdgeData(id, { points });
	}, [id, points, updateEdgeData]);

	useEdgeStateEventsInHandlers(id, setPoints);

	return (
		<Box
			component="g"
			sx={{
				pointerEvents: "all",
				".react-flow__edge-path__point": {
					visibility: "hidden",
					opacity: 0,
				},
				"&:hover": {
					".react-flow__edge-path__point": {
						visibility: "visible",
						opacity: 1,
					},
				},
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

export default CustomEdge;
