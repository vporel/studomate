"use client";

import { STEP_HANDLE_SOURCE_ACTION } from "@/schemas/grafcet/step.schema";
import { getStraightPathFromPoints } from "@/ui/lib/svg";
import { getHandleConnectionLinePoints } from "@/ui/utils/grafcet/grafcet-utils";
import { ConnectionLineComponentProps, Position } from "@xyflow/react";

/**
 * Line drawn while a connection is being dragged. The drag may start from a target handle, in
 * which case the cursor is the source side: the route is computed in the real source → target
 * direction, so that it is the one the created link will have.
 */
const GrafcetConnectionLine = ({
	fromX,
	fromY,
	toX,
	toY,
	fromHandle,
	toHandle,
}: ConnectionLineComponentProps) => {
	const startsFromTarget = fromHandle?.type === "target";
	const points = startsFromTarget
		? getHandleConnectionLinePoints(
				//A target handle on the left side only receives a horizontal link, from a step or an action
				fromHandle.position === Position.Left
					? STEP_HANDLE_SOURCE_ACTION
					: toHandle?.id,
				toX,
				toY,
				fromX,
				fromY,
			).reverse()
		: getHandleConnectionLinePoints(fromHandle?.id, fromX, fromY, toX, toY);
	return (
		<g>
			<path
				fill="none"
				stroke="black"
				strokeWidth={1.5}
				className="animated"
				d={getStraightPathFromPoints(points)}
			/>
			<circle
				cx={toX}
				cy={toY}
				fill="#fff"
				r={3}
				stroke="black"
				strokeWidth={1.5}
			/>
		</g>
	);
};

export default GrafcetConnectionLine;
