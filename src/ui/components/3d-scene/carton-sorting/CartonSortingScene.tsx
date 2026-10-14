"use client";

import {
	canPlaceCarton,
	CARTON_Y_P2,
	CARTON_Y_P3,
	SPEED_PER_MS,
	T1_LENGTH,
	type CartonSortingInteraction,
	type CartonSortingState,
} from "@/3d-scenes/carton-sorting/carton-sorting.model";
import { useFrame } from "@react-three/fiber";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { type Group, type Mesh, MeshStandardMaterial } from "three";
import type { SceneComponentProps } from "../scene-views";
import Box from "../parts/Box";
import ConveyorBelt from "../parts/ConveyorBelt";
import PushButton from "../parts/PushButton";
import PushCylinder from "../parts/PushCylinder";
import ToggleSwitch from "../parts/ToggleSwitch";

const SPEED = SPEED_PER_MS * 1000;
/** Model units to world units. */
const S = 0.01;
const LOW_HEIGHT = 0.32;
const HIGH_HEIGHT = 0.5;
const CHANNEL_X = T1_LENGTH * S;
const CHANNEL_WIDTH = 0.7;
const T1_WIDTH = 0.6;
/** A carton fills the width of the conveyor it travels on, so a retracted head stays clear of it. */
const CARTON_WIDTH = CHANNEL_WIDTH;
const CARTON_DEPTH = T1_WIDTH;
const OUTPUT_LENGTH = 2;
const T1_START_X = -0.6;
/** T1 ends flush with the channel's far edge, so the carton at the station is fully on it. */
const T1_END_X = CHANNEL_X + CHANNEL_WIDTH / 2;
/** The channel starts where T1's side edge ends: the two conveyors touch without overlapping. */
const CHANNEL_START_Z = T1_WIDTH / 2;
const CHANNEL_END_Z = 3.2;
const LOW_COLOR = "#64b5f6";
const HIGH_COLOR = "#ffa726";
const P1_BODY_Z = -0.9;
const P1_BODY_LENGTH = 0.5;
const PUSH_BODY_X = CHANNEL_X - 1.3;
const PUSH_BODY_LENGTH = 0.5;
/** Two outputs of two places each. */
const SORTED_POOL_SIZE = 4;

const sortedMaterials = {
	low: new MeshStandardMaterial({ color: LOW_COLOR }),
	high: new MeshStandardMaterial({ color: HIGH_COLOR }),
};

/** 3D rendering of the carton sorting station from the states of its physical model. */
export default function CartonSortingScene({
	sample,
	interactive,
	send,
}: SceneComponentProps) {
	const t = useTranslations("scene3d.cartonSorting");
	const carton = useRef<Group>(null);
	const cartonBox = useRef<Mesh>(null);
	const cartonMaterial = useRef<MeshStandardMaterial>(null);
	const strokes = {
		p1: useRef(0),
		p2: useRef(0),
		p3: useRef(0),
	};
	const sortedCartons = useRef<(Group | null)[]>([]);
	const [canPlace, setCanPlace] = useState(true);
	const canPlaceRef = useRef(true);
	const [liveHigh, setLiveHigh] = useState(false);
	const liveHighRef = useRef(false);
	const belts = useRef({ t1: false, t2t3: false });

	useFrame(() => {
		const state = sample() as CartonSortingState | null;
		if (!state) return;
		belts.current.t1 = state.t1Running;
		belts.current.t2t3 = state.t2t3Running;
		strokes.p1.current = state.cylinders.p1;
		strokes.p2.current = state.cylinders.p2;
		strokes.p3.current = state.cylinders.p3;
		const height = state.cartonTall ? HIGH_HEIGHT : LOW_HEIGHT;
		if (carton.current) {
			carton.current.visible = state.cartonExists;
			carton.current.position.set(
				(state.cartonPos + state.cartonXExtra) * S,
				0.05 + height / 2,
				state.cartonY * S,
			);
		}
		if (cartonBox.current) cartonBox.current.scale.y = height / LOW_HEIGHT;
		cartonMaterial.current?.color.set(
			state.cartonTall ? HIGH_COLOR : LOW_COLOR,
		);
		sortedCartons.current.forEach((group, index) => {
			if (!group) return;
			const sorted = state.sortedCartons[index];
			group.visible = !!sorted;
			if (!sorted) return;
			const height = sorted.tall ? HIGH_HEIGHT : LOW_HEIGHT;
			group.position.set(
				(T1_LENGTH + sorted.x) * S,
				0.05 + height / 2,
				sorted.y * S,
			);
			group.scale.y = height / LOW_HEIGHT;
			(group.children[0] as Mesh).material = sorted.tall
				? sortedMaterials.high
				: sortedMaterials.low;
		});
		const placeable = canPlaceCarton(state);
		if (canPlaceRef.current !== placeable) {
			canPlaceRef.current = placeable;
			setCanPlace(placeable);
		}
		if (liveHighRef.current !== state.cartonHigh) {
			liveHighRef.current = state.cartonHigh;
			setLiveHigh(state.cartonHigh);
		}
	});

	const sendInteraction = (interaction: CartonSortingInteraction) =>
		send(interaction);
	const outputX = CHANNEL_X + CHANNEL_WIDTH / 2 + OUTPUT_LENGTH / 2;

	return (
		<group>
			{/* Conveyor T1 and ejection channel */}
			<ConveyorBelt
				position={[(T1_START_X + T1_END_X) / 2, 0, 0]}
				axis="x"
				length={T1_END_X - T1_START_X}
				width={T1_WIDTH}
				running={() => belts.current.t1}
				speed={SPEED * S}
				color="#5f6b73"
				slatColor="#3b444a"
			/>
			<ConveyorBelt
				position={[CHANNEL_X, 0, (CHANNEL_START_Z + CHANNEL_END_Z) / 2]}
				axis="z"
				length={CHANNEL_END_Z - CHANNEL_START_Z}
				width={CHANNEL_WIDTH}
				running={() => belts.current.t2t3}
				speed={SPEED * S}
				color="#cfd8dc"
				slatColor="#90a4ae"
			/>
			{/* Outputs */}
			<Box
				position={[outputX, 0, CARTON_Y_P2 * S]}
				size={[OUTPUT_LENGTH, 0.06, T1_WIDTH]}
				color={LOW_COLOR}
			/>
			<Box
				position={[outputX, 0, CARTON_Y_P3 * S]}
				size={[OUTPUT_LENGTH, 0.06, T1_WIDTH]}
				color={HIGH_COLOR}
			/>

			<PushCylinder
				axis="z"
				fixed={CHANNEL_X}
				bodyStart={P1_BODY_Z - P1_BODY_LENGTH / 2}
				bodyLength={P1_BODY_LENGTH}
				frontAtRest={-T1_WIDTH / 2}
				stroke={strokes.p1}
				unit={S}
				color="#546e7a"
			/>
			<PushCylinder
				axis="x"
				fixed={CARTON_Y_P2 * S}
				bodyStart={PUSH_BODY_X}
				bodyLength={PUSH_BODY_LENGTH}
				frontAtRest={CHANNEL_X - CHANNEL_WIDTH / 2}
				stroke={strokes.p2}
				unit={S}
				color="#607d8b"
			/>
			<PushCylinder
				axis="x"
				fixed={CARTON_Y_P3 * S}
				bodyStart={PUSH_BODY_X}
				bodyLength={PUSH_BODY_LENGTH}
				frontAtRest={CHANNEL_X - CHANNEL_WIDTH / 2}
				stroke={strokes.p3}
				unit={S}
				color="#607d8b"
			/>

			{Array.from({ length: SORTED_POOL_SIZE }, (_, index) => (
				<group
					key={index}
					visible={false}
					ref={(group) => {
						sortedCartons.current[index] = group;
					}}
				>
					<mesh>
						<boxGeometry args={[CARTON_WIDTH, LOW_HEIGHT, CARTON_DEPTH]} />
						<meshStandardMaterial color={LOW_COLOR} />
					</mesh>
				</group>
			))}
			<group ref={carton} visible={false}>
				<mesh ref={cartonBox}>
					<boxGeometry args={[CARTON_WIDTH, LOW_HEIGHT, CARTON_DEPTH]} />
					<meshStandardMaterial ref={cartonMaterial} color={LOW_COLOR} />
				</mesh>
			</group>

			{/* Console */}
			<PushButton
				position={[1, 0, 2.4]}
				label={t("newCarton")}
				disabled={!canPlace}
				onPress={() => {
					if (interactive && canPlace) sendInteraction({ type: "newCarton" });
				}}
			/>
			<ToggleSwitch
				position={[2.4, 0, 2.4]}
				label={t("heightSwitch")}
				lowLabel={t("lowMark")}
				highLabel={t("highMark")}
				on={liveHigh}
				onToggle={() => {
					if (interactive)
						sendInteraction({ type: "setCartonHigh", high: !liveHigh });
				}}
			/>
		</group>
	);
}
