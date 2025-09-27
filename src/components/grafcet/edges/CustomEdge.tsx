import { getStraightPathFromPoints } from "@/lib/svg";
import { Box, useTheme } from "@mui/material";
import { Edge, useReactFlow, type EdgeProps } from "@xyflow/react";
import React, { useCallback, useEffect, useState } from "react";
import { getConnectionLinePoints } from "../connections-lines/CustomConnectionLine";

export type CustomEdgeData = { points: [number, number][] };

export type CustomEdgeType = Edge<CustomEdgeData> & { type: "custom-edge" };

function getPointsForAdding(points: [number, number][]): [number, number][] {
	const pointsForAdding: [number, number][] = [];
	for (let i = 1; i < points.length; i++)
		pointsForAdding.push([(points[i][0] + points[i - 1][0]) / 2, (points[i][1] + points[i - 1][1]) / 2]);
	return pointsForAdding;
}

const CustomEdge = ({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	data,
	interactionWidth,
	selected,
}: EdgeProps<CustomEdgeType>) => {
	const th = useTheme();
	const { updateEdgeData, screenToFlowPosition } = useReactFlow();
	const [points, setPoints] = useState<[number, number][]>(
		data?.points ?? getConnectionLinePoints(sourceX, sourceY, targetX, targetY)
	);
	const [pointsForAdding, setPointsForAdding] = useState<[number, number][]>(getPointsForAdding(points));
	const pathString = getStraightPathFromPoints(points);
	const color = !selected ? "black" : th.palette.primary.main;
	const addPoint = useCallback(
		(index: number) => {
			setPoints((pts) => {
				const newPoints = [...pts];
				newPoints.splice(index + 1, 0, pointsForAdding[index]);
				return newPoints;
			});
		},
		[pointsForAdding]
	);

	//Create the points for adding
	useEffect(() => {
		setPointsForAdding(getPointsForAdding(points));
	}, [points]);

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

	function handlePointPointerDown(e: React.PointerEvent<SVGCircleElement>, index: number) {
		e.stopPropagation();
		(e.target as SVGCircleElement).setPointerCapture(e.pointerId);
		if (e.buttons === 2) {
			//Right click
			//Delete point on right click
			if (index > 0 && index < points.length - 1) {
				setPoints((pts) => {
					const newPoints = [...pts];
					newPoints.splice(index, 1);
					setPointsForAdding(getPointsForAdding(newPoints));
					return newPoints;
				});
			}
		}
	}

	function handlePointPointerMove(e: React.PointerEvent<SVGCircleElement>, index: number) {
		if (e.buttons !== 1) return;
		const { x, y } = screenToFlowPosition({ x: e.pageX, y: e.pageY });
		setPoints((pts) => {
			const newPoints = [...pts];
			newPoints.splice(index, 1, [x, y]);
			setPointsForAdding(getPointsForAdding(newPoints));
			return newPoints;
		});
	}

	function handlePointPointerUp(e: React.PointerEvent<SVGCircleElement>, index: number) {
		(e.target as SVGCircleElement).releasePointerCapture(e.pointerId);
	}

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
					)
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
