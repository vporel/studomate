"use client";

import {
	CABIN_TRAVEL,
	DOOR_TRAVEL,
	FLOOR_POSITIONS,
	type ElevatorState,
} from "@/3d-scenes/elevator/v1/elevator.model";
import { useFrame } from "@react-three/fiber";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import type { Group } from "three";
import type { SceneComponentProps } from "@/ui/components/3d-scene/scene-views";
import Box from "@/ui/components/3d-scene/parts/Box";
import Label from "@/ui/components/3d-scene/parts/Label";
import { SCENE_ORIGIN } from "@/ui/components/3d-scene/scene-origin";

/** Model units to world units. */
const S = 0.014;
const SHAFT_WIDTH = 1.4;
const SHAFT_DEPTH = 1.0;
const POST = 0.08;
const SLAB = 0.1;
const CABIN_WIDTH = 1.0;
const CABIN_HEIGHT = 1.1;
const CABIN_DEPTH = 0.9;
const WALL = 0.04;
const PILLAR_WIDTH = 0.2;
const DOOR_WIDTH = CABIN_WIDTH / 2 - PILLAR_WIDTH;
/** Depth of a door leaf: it slides just behind the pillars of the cabin front. */
const LEAF_Z = CABIN_DEPTH / 2 - 0.08;
const LANDING_WIDTH = 2.4;
const LANDING_DEPTH = 1.3;
const FRAME_HEIGHT = CABIN_HEIGHT + 0.1;
const COUNTERWEIGHT_HEIGHT = 0.5;
const COUNTERWEIGHT_X = SHAFT_WIDTH / 2 - 0.2;
const COUNTERWEIGHT_MARGIN = 0.3;
const SHAFT_TOP = CABIN_TRAVEL * S + CABIN_HEIGHT + 0.25;
const ROPE_Y = SHAFT_TOP - 0.05;
const PULLEY_RADIUS = 0.07;
const FLOOR_KEYS = ["floor0", "floor1", "floor2"] as const;
/** Where the lift sits in the world, at the point the camera looks at. */

/** 3D rendering of the lift from the states of its physical model. */
export default function ElevatorScene({ sample }: SceneComponentProps) {
	const t = useTranslations("scene3d.elevator");
	const cabin = useRef<Group>(null);
	const leftLeaf = useRef<Group>(null);
	const rightLeaf = useRef<Group>(null);
	const cable = useRef<Group>(null);
	const counterweightCable = useRef<Group>(null);
	const counterweight = useRef<Group>(null);

	useFrame(() => {
		const state = sample() as ElevatorState | null;
		if (
			!state ||
			!cabin.current ||
			!leftLeaf.current ||
			!rightLeaf.current ||
			!cable.current ||
			!counterweightCable.current ||
			!counterweight.current
		)
			return;
		const cabinBase = state.position * S;
		cabin.current.position.y = cabinBase;
		const slide = (state.doorPosition / DOOR_TRAVEL) * DOOR_WIDTH;
		leftLeaf.current.position.x = -DOOR_WIDTH / 2 - slide;
		rightLeaf.current.position.x = DOOR_WIDTH / 2 + slide;
		cable.current.position.y = cabinBase + CABIN_HEIGHT;
		cable.current.scale.y = ROPE_Y - cabinBase - CABIN_HEIGHT;
		const counterweightBase =
			(CABIN_TRAVEL - state.position) * S + COUNTERWEIGHT_MARGIN;
		counterweight.current.position.y =
			counterweightBase + COUNTERWEIGHT_HEIGHT / 2;
		counterweightCable.current.position.y =
			counterweightBase + COUNTERWEIGHT_HEIGHT;
		counterweightCable.current.scale.y =
			ROPE_Y - counterweightBase - COUNTERWEIGHT_HEIGHT;
	});

	const frontZ = SHAFT_DEPTH / 2;

	return (
		<group position={SCENE_ORIGIN}>
			<Box
				position={[0, -SLAB / 2, 0]}
				size={[SHAFT_WIDTH + 0.2, SLAB, SHAFT_DEPTH + 0.2]}
				color="#546e7a"
			/>
			<Box
				position={[0, SHAFT_TOP + SLAB / 2, 0]}
				size={[SHAFT_WIDTH + 0.2, SLAB, SHAFT_DEPTH + 0.2]}
				color="#546e7a"
			/>
			<Box
				position={[0, SHAFT_TOP / 2, -frontZ + WALL / 2]}
				size={[SHAFT_WIDTH, SHAFT_TOP, WALL]}
				color="#cfd8dc"
			/>
			{[-1, 1].map((side) => (
				<group key={side}>
					<mesh position={[(side * SHAFT_WIDTH) / 2, SHAFT_TOP / 2, 0]}>
						<boxGeometry args={[WALL / 2, SHAFT_TOP, SHAFT_DEPTH]} />
						<meshStandardMaterial
							color="#90caf9"
							transparent
							opacity={0.22}
							depthWrite={false}
						/>
					</mesh>
					{[-1, 1].map((depth) => (
						<Box
							key={depth}
							position={[
								(side * SHAFT_WIDTH) / 2,
								SHAFT_TOP / 2,
								(depth * SHAFT_DEPTH) / 2,
							]}
							size={[POST, SHAFT_TOP, POST]}
							color="#607d8b"
						/>
					))}
					<Box
						position={[side * (CABIN_WIDTH / 2 + 0.06), SHAFT_TOP / 2, 0]}
						size={[0.03, SHAFT_TOP, 0.05]}
						color="#b0bec5"
					/>
				</group>
			))}

			{FLOOR_POSITIONS.map((position, floor) => {
				const y = position * S;
				return (
					<group key={floor}>
						<Box
							position={[0, y - SLAB / 2, frontZ + LANDING_DEPTH / 2]}
							size={[LANDING_WIDTH, SLAB, LANDING_DEPTH]}
							color="#78909c"
						/>
						{[-1, 1].map((side) => (
							<Box
								key={side}
								position={[
									side * (DOOR_WIDTH + 0.04),
									y + FRAME_HEIGHT / 2,
									frontZ,
								]}
								size={[0.08, FRAME_HEIGHT, 0.08]}
								color="#455a64"
							/>
						))}
						<Box
							position={[0, y + FRAME_HEIGHT, frontZ]}
							size={[2 * DOOR_WIDTH + 0.16, 0.08, 0.08]}
							color="#455a64"
						/>
						<Label
							position={[
								-LANDING_WIDTH / 2 + 0.3,
								y + 0.45,
								frontZ + LANDING_DEPTH - 0.2,
							]}
						>
							{t(FLOOR_KEYS[floor])}
						</Label>
					</group>
				);
			})}

			<group
				ref={counterweight}
				position={[
					COUNTERWEIGHT_X,
					COUNTERWEIGHT_MARGIN + COUNTERWEIGHT_HEIGHT / 2,
					0,
				]}
			>
				<Box
					position={[0, 0, 0]}
					size={[0.14, COUNTERWEIGHT_HEIGHT, 0.4]}
					color="#6d4c41"
				/>
			</group>

			<group
				ref={counterweightCable}
				position={[
					COUNTERWEIGHT_X,
					COUNTERWEIGHT_MARGIN + COUNTERWEIGHT_HEIGHT,
					0,
				]}
			>
				<Box position={[0, 0.5, 0]} size={[0.03, 1, 0.03]} color="#263238" />
			</group>

			<group ref={cable} position={[0, CABIN_HEIGHT, 0]}>
				<Box position={[0, 0.5, 0]} size={[0.03, 1, 0.03]} color="#263238" />
			</group>

			<Box
				position={[COUNTERWEIGHT_X / 2, ROPE_Y, 0]}
				size={[COUNTERWEIGHT_X, 0.03, 0.03]}
				color="#263238"
			/>
			{[0, COUNTERWEIGHT_X].map((x) => (
				<mesh key={x} position={[x, ROPE_Y, 0]} rotation={[Math.PI / 2, 0, 0]}>
					<cylinderGeometry args={[PULLEY_RADIUS, PULLEY_RADIUS, 0.08, 20]} />
					<meshStandardMaterial color="#455a64" />
				</mesh>
			))}

			<group ref={cabin} position={[0, 0, 0]}>
				<Box
					position={[0, WALL / 2, 0]}
					size={[CABIN_WIDTH, WALL, CABIN_DEPTH]}
					color="#b0bec5"
				/>
				<Box
					position={[0, CABIN_HEIGHT / 2, -CABIN_DEPTH / 2]}
					size={[CABIN_WIDTH, CABIN_HEIGHT, WALL]}
					color="#90a4ae"
				/>
				{[-1, 1].map((side) => (
					<Box
						key={side}
						position={[(side * CABIN_WIDTH) / 2, CABIN_HEIGHT / 2, 0]}
						size={[WALL, CABIN_HEIGHT, CABIN_DEPTH]}
						color="#90a4ae"
					/>
				))}
				<Box
					position={[0, CABIN_HEIGHT, 0]}
					size={[CABIN_WIDTH + WALL, WALL, CABIN_DEPTH]}
					color="#78909c"
				/>
				{[-1, 1].map((side) => (
					<Box
						key={side}
						position={[
							side * (CABIN_WIDTH / 2 - PILLAR_WIDTH / 2),
							CABIN_HEIGHT / 2,
							CABIN_DEPTH / 2,
						]}
						size={[PILLAR_WIDTH, CABIN_HEIGHT, WALL * 2]}
						color="#607d8b"
					/>
				))}
				<group ref={leftLeaf} position={[-DOOR_WIDTH / 2, 0, 0]}>
					<Box
						position={[0, CABIN_HEIGHT / 2, LEAF_Z]}
						size={[DOOR_WIDTH, CABIN_HEIGHT, WALL]}
						color="#eceff1"
					/>
				</group>
				<group ref={rightLeaf} position={[DOOR_WIDTH / 2, 0, 0]}>
					<Box
						position={[0, CABIN_HEIGHT / 2, LEAF_Z]}
						size={[DOOR_WIDTH, CABIN_HEIGHT, WALL]}
						color="#eceff1"
					/>
				</group>
			</group>
		</group>
	);
}
