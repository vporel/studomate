"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { type MeshStandardMaterial } from "three";
import type { LightState } from "@/3d-scenes/crossroads/v1/crossroads.model";
import Box from "./Box";

const BULBS = [
	{ key: "red", on: "#ff0000", off: "#6b1a1a", y: 1.2 },
	{ key: "orange", on: "#ffa500", off: "#6b4c12", y: 0.95 },
	{ key: "green", on: "#00d94a", off: "#14502a", y: 0.7 },
] as const;

/** Post carrying a three-bulb head; `read` gives the lit bulbs for the current frame. */
export default function TrafficLightHead({
	position,
	rotationY,
	read,
}: {
	position: [number, number, number];
	rotationY: number;
	read: () => LightState | null;
}) {
	const materials = useRef<Record<string, MeshStandardMaterial | null>>({});

	useFrame(() => {
		const lights = read();
		for (const { key, on, off } of BULBS) {
			const material = materials.current[key];
			if (!material) continue;
			const lit = lights?.[key] === true;
			material.color.set(lit ? on : off);
			material.emissive.set(lit ? on : "#000000");
			material.emissiveIntensity = lit ? 0.6 : 0;
		}
	});

	return (
		<group position={position} rotation={[0, rotationY, 0]}>
			<Box position={[0, 0.4, 0]} size={[0.06, 0.8, 0.06]} color="#455a64" />
			<Box position={[0, 0.95, 0]} size={[0.24, 0.7, 0.2]} color="#212121" />
			{BULBS.map(({ key, off, y }) => (
				<mesh key={key} position={[0, y, 0.11]}>
					<sphereGeometry args={[0.08, 16, 16]} />
					<meshStandardMaterial
						ref={(material) => {
							materials.current[key] = material;
						}}
						color={off}
						roughness={0.9}
						toneMapped={false}
						emissive="#000000"
						emissiveIntensity={0}
					/>
				</mesh>
			))}
		</group>
	);
}
