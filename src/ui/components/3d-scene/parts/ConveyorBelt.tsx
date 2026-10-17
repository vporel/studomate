"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";

const SLAT_SPACING = 0.3;
const SLAT_THICKNESS = 0.05;

/** Conveyor whose slats travel along `axis` at `speed` (world units per second) while `running()` holds. */
export default function ConveyorBelt({
	position,
	axis,
	length,
	width,
	running,
	speed,
	color,
	slatColor,
}: {
	position: [number, number, number];
	axis: "x" | "z";
	length: number;
	width: number;
	running: () => boolean;
	speed: number;
	color: string;
	slatColor: string;
}) {
	const slatCount = Math.max(1, Math.floor(length / SLAT_SPACING));
	const spacing = length / slatCount;
	const slats = useRef<(Mesh | null)[]>([]);
	const offset = useRef(0);

	useFrame((_, delta) => {
		if (running()) offset.current = (offset.current + speed * delta) % spacing;
		slats.current.forEach((slat, index) => {
			if (!slat) return;
			const along = ((index * spacing + offset.current) % length) - length / 2;
			slat.visible = Math.abs(along) <= (length - SLAT_THICKNESS) / 2;
			if (axis === "x") slat.position.x = along;
			else slat.position.z = along;
		});
	});

	const slatSize: [number, number, number] =
		axis === "x"
			? [SLAT_THICKNESS, 0.02, width]
			: [width, 0.02, SLAT_THICKNESS];
	const bedSize: [number, number, number] =
		axis === "x" ? [length, 0.1, width] : [width, 0.1, length];

	return (
		<group position={position}>
			<mesh>
				<boxGeometry args={bedSize} />
				<meshStandardMaterial color={color} />
			</mesh>
			{Array.from({ length: slatCount }, (_, index) => (
				<mesh
					key={index}
					position={[0, 0.06, 0]}
					ref={(slat) => {
						slats.current[index] = slat;
					}}
				>
					<boxGeometry args={slatSize} />
					<meshStandardMaterial color={slatColor} />
				</mesh>
			))}
		</group>
	);
}
