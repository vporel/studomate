"use client";

import {
	CAR_LENGTH,
	CAR_WIDTH,
	carPosition,
	HALF_CROSSING,
	LANE_KEYS,
	LANES,
	ROAD_HALF,
	STOP_LINE,
	type CrossroadsState,
	type LaneKey,
} from "@/3d-scenes/crossroads/v1/crossroads.model";
import { useFrame } from "@react-three/fiber";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { type Group, type Mesh, MeshStandardMaterial } from "three";
import type { SceneComponentProps } from "@/ui/components/3d-scene/scene-views";
import Box from "@/ui/components/3d-scene/parts/Box";
import Label from "@/ui/components/3d-scene/parts/Label";
import TrafficLightHead from "@/ui/components/3d-scene/parts/TrafficLightHead";
import { SCENE_ORIGIN } from "@/ui/components/3d-scene/scene-origin";

/** Model units to world units. */
const S = 0.01;
/** Cars that can be on one lane at once. */
const CAR_POOL_SIZE = 12;
const CAR_HEIGHT = 0.22;
const ROAD_WIDTH = 2 * HALF_CROSSING * S;
const ROAD_LENGTH = 2 * ROAD_HALF * S;
const ROAD_COLOR = "#455a64";
const DASH_COUNT = 12;
const CAR_COLORS = [
	"#e53935",
	"#1e88e5",
	"#fdd835",
	"#43a047",
	"#8e24aa",
	"#f5f5f5",
];
/** Where the crossing sits in the world, at the point the camera looks at. */

const carMaterials = CAR_COLORS.map(
	(color) => new MeshStandardMaterial({ color }),
);

/** The poles stand on the right-hand edge of the road, just before the stop line. */
function lightPlacement(lane: LaneKey): {
	position: [number, number, number];
	rotationY: number;
} {
	const { axis, offset, heading } = LANES[lane];
	const along = carPosition(lane, STOP_LINE)[axis];
	const side = Math.sign(offset) * (HALF_CROSSING + 12);
	const [x, z] = axis === "z" ? [side, along] : [along, side];
	return { position: [x * S, 0, z * S], rotationY: heading + Math.PI };
}

/** 3D rendering of the crossroads from the states of its physical model. */
export default function CrossroadsScene({ sample }: SceneComponentProps) {
	const t = useTranslations("scene3d.crossroads");
	const cars = useRef<Record<LaneKey, (Group | null)[]>>({
		NS1: [],
		NS2: [],
		EO1: [],
		EO2: [],
	});
	const crashMarker = useRef<Group>(null);
	const [crashAt, setCrashAt] = useState<[number, number] | null>(null);
	const crashRef = useRef<CrossroadsState["crash"]>(null);
	const [accidents, setAccidents] = useState(0);
	const accidentsRef = useRef(0);

	useFrame(() => {
		const state = sample() as CrossroadsState | null;
		if (!state) return;
		for (const lane of LANE_KEYS) {
			cars.current[lane].forEach((group, index) => {
				if (!group) return;
				const car = state.lanes[lane][index];
				group.visible = !!car;
				if (!car) return;
				const { x, z } = carPosition(lane, car.s);
				group.position.set(x * S, 0.05 + CAR_HEIGHT / 2, z * S);
				(group.children[0] as Mesh).material =
					carMaterials[car.id % carMaterials.length];
			});
		}
		if (crashMarker.current) {
			crashMarker.current.visible = !!state.crash;
			crashMarker.current.rotation.y += 0.1;
		}
		if ((crashRef.current === null) !== (state.crash === null)) {
			setCrashAt(state.crash ? [state.crash.x * S, state.crash.z * S] : null);
		}
		crashRef.current = state.crash;
		if (accidentsRef.current !== state.accidents) {
			accidentsRef.current = state.accidents;
			setAccidents(state.accidents);
		}
	});

	return (
		<group position={SCENE_ORIGIN}>
			<Box
				position={[0, 0, 0]}
				size={[ROAD_WIDTH, 0.1, ROAD_LENGTH]}
				color={ROAD_COLOR}
			/>
			<Box
				position={[0, 0, 0]}
				size={[ROAD_LENGTH, 0.1, ROAD_WIDTH]}
				color={ROAD_COLOR}
			/>
			<Box
				position={[0, 0.051, 0]}
				size={[ROAD_WIDTH, 0.002, ROAD_WIDTH]}
				color="#546e7a"
			/>
			{Array.from({ length: DASH_COUNT }, (_, index) => {
				const along = ((index + 0.5) / DASH_COUNT - 0.5) * ROAD_LENGTH;
				if (Math.abs(along) < HALF_CROSSING * S + 0.1) return null;
				return (
					<group key={index}>
						<Box
							position={[0, 0.052, along]}
							size={[0.04, 0.002, 0.25]}
							color="#eceff1"
						/>
						<Box
							position={[along, 0.052, 0]}
							size={[0.25, 0.002, 0.04]}
							color="#eceff1"
						/>
					</group>
				);
			})}
			{LANE_KEYS.map((lane) => {
				const { axis, offset, direction } = LANES[lane];
				const stop = carPosition(lane, STOP_LINE)[axis] * S;
				const position: [number, number, number] =
					axis === "z"
						? [offset * S, 0.052, stop + direction * 0.05]
						: [stop + direction * 0.05, 0.052, offset * S];
				const size: [number, number, number] =
					axis === "z"
						? [HALF_CROSSING * S, 0.002, 0.06]
						: [0.06, 0.002, HALF_CROSSING * S];
				return (
					<Box key={lane} position={position} size={size} color="#eceff1" />
				);
			})}

			{LANE_KEYS.map((lane) => {
				const { position, rotationY } = lightPlacement(lane);
				return (
					<TrafficLightHead
						key={lane}
						position={position}
						rotationY={rotationY}
						read={() =>
							(sample() as CrossroadsState | null)?.lights[lane] ?? null
						}
					/>
				);
			})}

			{LANE_KEYS.map((lane) =>
				Array.from({ length: CAR_POOL_SIZE }, (_, index) => (
					<group
						key={`${lane}-${index}`}
						visible={false}
						rotation={[0, LANES[lane].heading, 0]}
						ref={(group) => {
							cars.current[lane][index] = group;
						}}
					>
						<mesh material={carMaterials[0]}>
							<boxGeometry args={[CAR_WIDTH * S, CAR_HEIGHT, CAR_LENGTH * S]} />
						</mesh>
					</group>
				)),
			)}

			<group
				ref={crashMarker}
				visible={false}
				position={crashAt ? [crashAt[0], 0.4, crashAt[1]] : [0, 0.4, 0]}
			>
				<mesh>
					<octahedronGeometry args={[0.35]} />
					<meshStandardMaterial
						color="#ff5722"
						emissive="#ff5722"
						emissiveIntensity={1.5}
					/>
				</mesh>
			</group>
			{crashAt && (
				<Label position={[crashAt[0], 1.1, crashAt[1]]}>{t("collision")}</Label>
			)}
			<Label position={[-3, 0.2, -3.4]}>
				{t("accidents", { count: accidents })}
			</Label>
		</group>
	);
}
