"use client";

import { getStraightPathFromPoints } from "@/ui/lib/svg";
import { getConnectionLinePoints } from "@/ui/utils/grafcet/grafcet-utils";
import { ConnectionLineComponentProps } from "@xyflow/react";

const GrafcetConnectionLine = ({ fromX, fromY, toX, toY }: ConnectionLineComponentProps) => {
	return (
		<g>
			<path
				fill="none"
				stroke="black"
				strokeWidth={1.5}
				className="animated"
				d={getStraightPathFromPoints(getConnectionLinePoints(fromX, fromY, toX, toY))}
			/>
			<circle cx={toX} cy={toY} fill="#fff" r={3} stroke="black" strokeWidth={1.5} />
		</g>
	);
};

export default GrafcetConnectionLine;
