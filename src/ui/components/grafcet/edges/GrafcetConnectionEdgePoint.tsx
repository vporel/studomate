"use client";

import { memo, type PointerEvent } from "react";

interface GrafcetConnectionEdgePointProps {
	index: number;
	x: number;
	y: number;
	color: string;
	/** `move` : point intermédiaire déplaçable (clic droit = suppression) ;
	 *  `add` : marqueur d'ajout au milieu d'un segment. */
	mode: "move" | "add";
	onPointerDown?: (e: PointerEvent<SVGCircleElement>, index: number) => void;
	onPointerMove?: (e: PointerEvent<SVGCircleElement>, index: number) => void;
	onPointerUp?: (e: PointerEvent<SVGCircleElement>, index: number) => void;
	onAdd?: (index: number) => void;
}

const GrafcetConnectionEdgePoint = ({
	index,
	x,
	y,
	color,
	mode,
	onPointerDown,
	onPointerMove,
	onPointerUp,
	onAdd,
}: GrafcetConnectionEdgePointProps) => (
	<g>
		<circle
			className="react-flow__edge-path__point"
			cx={x}
			cy={y}
			r={3}
			fill={mode === "add" ? "#fff" : color}
			stroke={color}
			strokeWidth={1.5}
		/>
		<circle
			className="react-flow__edge-path__point"
			cx={x}
			cy={y}
			r={6}
			fill="transparent"
			onPointerDown={
				mode === "move" ? (e) => onPointerDown?.(e, index) : undefined
			}
			onPointerMove={
				mode === "move" ? (e) => onPointerMove?.(e, index) : undefined
			}
			onPointerUp={mode === "move" ? (e) => onPointerUp?.(e, index) : undefined}
			onClick={mode === "add" ? () => onAdd?.(index) : undefined}
		/>
	</g>
);

export default memo(GrafcetConnectionEdgePoint);
