"use client";

import {
	DRILL_TRAVEL,
	type DrillingState,
} from "@/3d-scenes/drilling/drilling.model";
import { useFrame } from "@react-three/fiber";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import type { Group, Mesh } from "three";
import type { SceneComponentProps } from "../scene-views";
import Box from "../parts/Box";
import Label from "../parts/Label";
import { SCENE_ORIGIN } from "@/ui/components/3d-scene/scene-origin";

/** Model units to world units. */
const S = 0.014;
const BASE_HEIGHT = 0.2;
const PIECE_HEIGHT = 0.4;
const PIECE_TOP = BASE_HEIGHT + PIECE_HEIGHT;
/** Height of the tip of the bit at the top limit. */
const TIP_AT_TOP = PIECE_TOP + DRILL_TRAVEL * S;
const COLUMN_HEIGHT = 3.4;
const COLUMN_X = -0.8;
const BIT_LENGTH = 0.5;
const BIT_RADIUS = 0.04;
const CHUCK_HEIGHT = 0.3;
const MOTOR_HEIGHT = 0.5;
const HOLE_RADIUS = 0.1;
/** Where the station sits in the world, at the point the camera looks at. */

/** 3D rendering of the drilling station from the states of its physical model. */
export default function DrillingScene({ sample }: SceneComponentProps) {
	const t = useTranslations("scene3d.drilling");
	const carriage = useRef<Group>(null);
	const rotor = useRef<Group>(null);
	const hole = useRef<Mesh>(null);

	useFrame(() => {
		const state = sample() as DrillingState | null;
		if (!state || !carriage.current || !rotor.current || !hole.current) return;
		carriage.current.position.y = TIP_AT_TOP - state.position * S;
		rotor.current.rotation.y = state.spindleAngle;
		hole.current.visible = state.holeProgress > 0;
		hole.current.scale.set(state.holeProgress, 1, state.holeProgress);
	});

	return (
		<group position={SCENE_ORIGIN}>
			<Box
				position={[0, BASE_HEIGHT / 2, 0]}
				size={[2.2, BASE_HEIGHT, 1.2]}
				color="#455a64"
			/>
			<Box
				position={[0, BASE_HEIGHT + PIECE_HEIGHT / 2, 0]}
				size={[0.9, PIECE_HEIGHT, 0.7]}
				color="#a1887f"
			/>
			<mesh ref={hole} position={[0, PIECE_TOP + 0.005, 0]} visible={false}>
				<cylinderGeometry args={[HOLE_RADIUS, HOLE_RADIUS, 0.01, 24]} />
				<meshStandardMaterial color="#3e2723" />
			</mesh>
			<Label position={[0, PIECE_TOP / 2, 0.6]}>{t("workpiece")}</Label>

			<Box
				position={[COLUMN_X, COLUMN_HEIGHT / 2, 0]}
				size={[0.25, COLUMN_HEIGHT, 0.3]}
				color="#607d8b"
			/>

			<group ref={carriage} position={[0, TIP_AT_TOP, 0]}>
				<Box
					position={[COLUMN_X / 2, BIT_LENGTH + CHUCK_HEIGHT + 0.25, 0]}
					size={[Math.abs(COLUMN_X), 0.2, 0.2]}
					color="#78909c"
				/>
				<Box
					position={[0, BIT_LENGTH + CHUCK_HEIGHT + MOTOR_HEIGHT / 2, 0]}
					size={[0.4, MOTOR_HEIGHT, 0.4]}
					color="#37474f"
				/>
				<group ref={rotor}>
					<mesh position={[0, BIT_LENGTH / 2, 0]}>
						<cylinderGeometry args={[BIT_RADIUS, BIT_RADIUS, BIT_LENGTH, 12]} />
						<meshStandardMaterial color="#cfd8dc" />
					</mesh>
					<Box
						position={[BIT_RADIUS, BIT_LENGTH / 2, 0]}
						size={[0.02, BIT_LENGTH, 0.02]}
						color="#546e7a"
					/>
					<mesh position={[0, BIT_LENGTH + CHUCK_HEIGHT / 2, 0]}>
						<cylinderGeometry args={[0.1, 0.1, CHUCK_HEIGHT, 16]} />
						<meshStandardMaterial color="#90a4ae" />
					</mesh>
					<Box
						position={[0.1, BIT_LENGTH + CHUCK_HEIGHT / 2, 0]}
						size={[0.02, CHUCK_HEIGHT, 0.04]}
						color="#37474f"
					/>
				</group>
			</group>
		</group>
	);
}
