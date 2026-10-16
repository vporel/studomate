"use client";

import {
	BARRIER_TRAVEL,
	CAR_LENGTH,
	CAR_WIDTH,
	LANE_OFFSET,
	PARKING_CAPACITY,
	STALL_X,
	STREET_LENGTH,
	carHeading,
	carPose,
	type ParkingState,
} from "@/3d-scenes/parking/v1/parking.model";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { type Group, type Mesh, MeshStandardMaterial } from "three";
import type { SceneComponentProps } from "@/ui/components/3d-scene/scene-views";
import Box from "@/ui/components/3d-scene/parts/Box";
import { SCENE_ORIGIN } from "@/ui/components/3d-scene/scene-origin";

/** Model units to world units. */
const S = 0.01;
const ROAD_COLOR = "#455a64";
const CAR_HEIGHT = 0.22;
const CAR_POOL_SIZE = 12;
const CAR_COLORS = [
	"#e53935",
	"#1e88e5",
	"#fdd835",
	"#43a047",
	"#8e24aa",
	"#f5f5f5",
];
const STALL_WIDTH = 46;
const STALL_DEPTH = 2 * LANE_OFFSET - 2 * CAR_WIDTH;
const LOT_START = 60;
const LOT_END = STALL_X[PARKING_CAPACITY - 1] + 60;
const ROAD_HALF_WIDTH = LANE_OFFSET + 30;
const BOOTH_Z = LANE_OFFSET + 38;
const ARM_LENGTH = 52;
/** Barrier arms of the entry lane (extends towards -z) and of the exit lane (towards +z). */
const ARMS = [
	{ side: 1, lane: LANE_OFFSET, gate: "entry" },
	{ side: -1, lane: -LANE_OFFSET, gate: "exit" },
] as const;

const carMaterials = CAR_COLORS.map(
	(color) => new MeshStandardMaterial({ color }),
);

/** 3D rendering of the car park from the states of its physical model. */
export default function ParkingScene({ sample }: SceneComponentProps) {
	const arms = useRef<(Group | null)[]>([]);
	const cars = useRef<(Group | null)[]>([]);

	useFrame(() => {
		const state = sample() as ParkingState | null;
		if (!state) return;
		ARMS.forEach(({ side, gate }, index) => {
			const arm = arms.current[index];
			if (!arm) return;
			const lift =
				(state.barriers[gate] / BARRIER_TRAVEL) * (Math.PI / 2) * 0.95;
			arm.rotation.x = side * lift;
		});
		cars.current.forEach((group, index) => {
			if (!group) return;
			const car = state.cars[index];
			group.visible = !!car;
			if (!car) return;
			const pose = carPose(car);
			group.position.set(pose.x * S, 0.05 + CAR_HEIGHT / 2, pose.z * S);
			group.rotation.y = carHeading(pose);
			(group.children[0] as Mesh).material =
				carMaterials[car.id % carMaterials.length];
		});
	});

	const lotCentre = (LOT_START + LOT_END) / 2;
	const roadStart = -STREET_LENGTH - 40;
	const roadEnd = LOT_END;

	return (
		<group position={SCENE_ORIGIN}>
			<Box
				position={[((roadStart + roadEnd) / 2) * S, 0, 0]}
				size={[(roadEnd - roadStart) * S, 0.1, 2 * ROAD_HALF_WIDTH * S]}
				color={ROAD_COLOR}
			/>
			<Box
				position={[lotCentre * S, 0.051, 0]}
				size={[(LOT_END - LOT_START) * S, 0.002, 2 * (LANE_OFFSET - 6) * S]}
				color="#546e7a"
			/>
			{[-1, 1].map((side) =>
				Array.from({ length: 10 }, (_, index) => (
					<Box
						key={`${side}-${index}`}
						position={[
							(roadStart + 30 + (index * (STREET_LENGTH + 40)) / 10) * S,
							0.052,
							side * LANE_OFFSET * S,
						]}
						size={[0.25, 0.002, 0.04]}
						color="#eceff1"
					/>
				)),
			)}

			{STALL_X.map((x) => (
				<group key={x}>
					{[-1, 1].map((side) => (
						<Box
							key={side}
							position={[(x + (side * STALL_WIDTH) / 2) * S, 0.052, 0]}
							size={[0.04, 0.002, STALL_DEPTH * S]}
							color="#eceff1"
						/>
					))}
				</group>
			))}

			{ARMS.map(({ side, lane }, index) => (
				<group key={lane}>
					<Box
						position={[0, 0.25, side * BOOTH_Z * S]}
						size={[0.22, 0.5, 0.22]}
						color="#ef6c00"
					/>
					<group
						ref={(group) => {
							arms.current[index] = group;
						}}
						position={[0, 0.45, side * BOOTH_Z * S]}
					>
						<Box
							position={[0, 0, -side * (ARM_LENGTH / 2) * S]}
							size={[0.06, 0.06, ARM_LENGTH * S]}
							color="#f5f5f5"
						/>
						<Box
							position={[0, 0, -side * (ARM_LENGTH / 2) * S]}
							size={[0.062, 0.062, ARM_LENGTH * S * 0.25]}
							color="#c62828"
						/>
					</group>
					<Box
						position={[0, 0.05 + 0.001, lane * S]}
						size={[0.05, 0.002, 2 * CAR_WIDTH * S]}
						color="#eceff1"
					/>
				</group>
			))}

			{Array.from({ length: CAR_POOL_SIZE }, (_, index) => (
				<group
					key={index}
					visible={false}
					ref={(group) => {
						cars.current[index] = group;
					}}
				>
					<mesh material={carMaterials[0]}>
						<boxGeometry args={[CAR_WIDTH * S, CAR_HEIGHT, CAR_LENGTH * S]} />
					</mesh>
				</group>
			))}
		</group>
	);
}
