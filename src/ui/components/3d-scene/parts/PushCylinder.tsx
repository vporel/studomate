"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";
import Box from "./Box";

/** Height of the axis of the cylinder above the ground, clear of the conveyors it crosses. */
const AXIS_HEIGHT = 0.3;
const BODY_HEIGHT = 0.3;
const HEAD_HEIGHT = 0.22;
const HEAD_WIDTH = 0.4;
const HEAD_THICKNESS = 0.2;
const ROD_SIZE = 0.08;
const PILLAR_WIDTH = 0.16;
const PILLAR_BOTTOM = -0.05;

/**
 * A pushing cylinder held above the ground by a pillar. Its head and rod follow `stroke`
 * (model units, scaled by `unit`) along `axis`; the head sits `frontAtRest` ahead of the body
 * when retracted.
 */
export default function PushCylinder({
	axis,
	fixed,
	bodyStart,
	bodyLength,
	frontAtRest,
	stroke,
	unit,
	color,
}: {
	axis: "x" | "z";
	/** Coordinate on the other axis. */
	fixed: number;
	/** Back end of the body on the axis of the push. */
	bodyStart: number;
	bodyLength: number;
	/** Front face of the head when retracted. */
	frontAtRest: number;
	stroke: React.RefObject<number>;
	/** World units per stroke unit. */
	unit: number;
	color: string;
}) {
	const head = useRef<Mesh>(null);
	const rod = useRef<Mesh>(null);
	const bodyEnd = bodyStart + bodyLength;

	useFrame(() => {
		const front = frontAtRest + stroke.current * unit;
		const rodEnd = front - HEAD_THICKNESS;
		if (head.current) head.current.position[axis] = front - HEAD_THICKNESS / 2;
		if (rod.current) {
			rod.current.position[axis] = (bodyEnd + rodEnd) / 2;
			rod.current.scale[axis] = Math.max(0.001, rodEnd - bodyEnd);
		}
	});

	const place = (along: number, y = AXIS_HEIGHT): [number, number, number] =>
		axis === "x" ? [along, y, fixed] : [fixed, y, along];
	const dims = (along: number, height: number, across: number) =>
		(axis === "x" ? [along, height, across] : [across, height, along]) as [
			number,
			number,
			number,
		];
	const bodyMiddle = (bodyStart + bodyEnd) / 2;
	const pillarHeight = AXIS_HEIGHT - BODY_HEIGHT / 2 - PILLAR_BOTTOM;

	return (
		<group>
			<Box
				position={place(bodyMiddle)}
				size={dims(bodyLength, BODY_HEIGHT, HEAD_WIDTH)}
				color="#37474f"
			/>
			<Box
				position={place(bodyMiddle, PILLAR_BOTTOM + pillarHeight / 2)}
				size={[PILLAR_WIDTH, pillarHeight, PILLAR_WIDTH]}
				color="#263238"
			/>
			<mesh ref={rod} position={place(bodyEnd)}>
				<boxGeometry args={dims(1, ROD_SIZE, ROD_SIZE)} />
				<meshStandardMaterial color="#b0bec5" />
			</mesh>
			<mesh ref={head} position={place(frontAtRest)}>
				<boxGeometry args={dims(HEAD_THICKNESS, HEAD_HEIGHT, HEAD_WIDTH)} />
				<meshStandardMaterial color={color} />
			</mesh>
		</group>
	);
}
