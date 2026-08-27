"use client";

import { getStraightPathFromPoints } from "@/ui/lib/svg";
import { getConnectionLinePoints } from "@/ui/utils/ladder/ladder-flow-builder";
import { ConnectionLineComponentProps } from "@xyflow/react";

const LadderConnectionLine = ({
	fromX,
	fromY,
	toX,
	toY,
}: ConnectionLineComponentProps) => {
	return (
		<g>
			<path
				fill="none"
				stroke="black"
				strokeWidth={1.5}
				d={getStraightPathFromPoints(
					getConnectionLinePoints(fromX, fromY, toX, toY),
				)}
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

export default LadderConnectionLine;
