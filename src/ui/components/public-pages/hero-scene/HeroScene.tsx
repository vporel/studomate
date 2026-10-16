"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import type { Group, Mesh } from "three";
import {
	CHANNEL_END_Z,
	CHANNEL_START_Z,
	CHANNEL_WIDTH,
	HIGH_Z,
	LOW_Z,
	OUTPUT_LENGTH,
	STATION_X,
	T1_START_X,
	T1_WIDTH,
	sampleHeroScene,
	type HeroSceneState,
} from "./hero-timeline";

const LOW_COLOR = "#64b5f6";
const HIGH_COLOR = "#ffa726";
const LOW_HEIGHT = 0.32;
const HIGH_HEIGHT = 0.5;
const T1_END_X = STATION_X + CHANNEL_WIDTH / 2;
const SLAT_SPACING = 0.3;
const BELT_SPEED = 1.5;
const AXIS_HEIGHT = 0.3;
const HEAD_THICKNESS = 0.2;
const CAMERA_TARGET: [number, number, number] = [3.6, 0.4, 1.4];
/** Share of the canvas width the plant is shifted right by, leaving the left side to the text. */
const RIGHT_SHIFT = 0.22;

type StateRef = React.RefObject<HeroSceneState>;

function Conveyor({
	center,
	axis,
	length,
	width,
	running,
	color,
	slatColor,
	state,
}: {
	center: [number, number, number];
	axis: "x" | "z";
	length: number;
	width: number;
	running: (state: HeroSceneState) => boolean;
	color: string;
	slatColor: string;
	state: StateRef;
}) {
	const count = Math.max(1, Math.floor(length / SLAT_SPACING));
	const spacing = length / count;
	const slats = useRef<(Mesh | null)[]>([]);
	const offset = useRef(0);

	useFrame((_, delta) => {
		if (running(state.current)) {
			offset.current = (offset.current + BELT_SPEED * delta) % spacing;
		}
		slats.current.forEach((slat, index) => {
			if (!slat) return;
			const along = ((index * spacing + offset.current) % length) - length / 2;
			slat.position[axis] = along;
		});
	});

	const bed: [number, number, number] =
		axis === "x" ? [length, 0.1, width] : [width, 0.1, length];
	const slat: [number, number, number] =
		axis === "x" ? [0.05, 0.02, width] : [width, 0.02, 0.05];

	return (
		<group position={center}>
			<mesh>
				<boxGeometry args={bed} />
				<meshStandardMaterial color={color} />
			</mesh>
			{Array.from({ length: count }, (_, index) => (
				<mesh
					key={index}
					position={[0, 0.06, 0]}
					ref={(mesh) => {
						slats.current[index] = mesh;
					}}
				>
					<boxGeometry args={slat} />
					<meshStandardMaterial color={slatColor} />
				</mesh>
			))}
		</group>
	);
}

function Pusher({
	axis,
	across,
	bodyEnd,
	frontAtRest,
	stroke,
	color,
	state,
}: {
	axis: "x" | "z";
	/** Coordinate on the other horizontal axis. */
	across: number;
	bodyEnd: number;
	frontAtRest: number;
	stroke: (state: HeroSceneState) => number;
	color: string;
	state: StateRef;
}) {
	const head = useRef<Mesh>(null);
	const rod = useRef<Mesh>(null);
	const bodyLength = 0.5;

	useFrame(() => {
		const front = frontAtRest + stroke(state.current);
		const rodEnd = front - HEAD_THICKNESS;
		if (head.current) head.current.position[axis] = front - HEAD_THICKNESS / 2;
		if (rod.current) {
			rod.current.position[axis] = (bodyEnd + rodEnd) / 2;
			rod.current.scale[axis] = Math.max(0.001, rodEnd - bodyEnd);
		}
	});

	const at = (along: number, y = AXIS_HEIGHT): [number, number, number] =>
		axis === "x" ? [along, y, across] : [across, y, along];
	const size = (along: number, height: number, width: number) =>
		(axis === "x" ? [along, height, width] : [width, height, along]) as [
			number,
			number,
			number,
		];

	return (
		<group>
			<mesh position={at(bodyEnd - bodyLength / 2)}>
				<boxGeometry args={size(bodyLength, 0.3, 0.4)} />
				<meshStandardMaterial color="#37474f" />
			</mesh>
			<mesh position={at(bodyEnd - bodyLength / 2, 0.05)}>
				<boxGeometry args={[0.16, 0.2, 0.16]} />
				<meshStandardMaterial color="#263238" />
			</mesh>
			<mesh ref={rod} position={at(bodyEnd)}>
				<boxGeometry args={size(1, 0.08, 0.08)} />
				<meshStandardMaterial color="#b0bec5" />
			</mesh>
			<mesh ref={head} position={at(frontAtRest)}>
				<boxGeometry args={size(HEAD_THICKNESS, 0.22, 0.4)} />
				<meshStandardMaterial color={color} />
			</mesh>
		</group>
	);
}

function Cartons({ state }: { state: StateRef }) {
	const groups = useRef<(Group | null)[]>([]);

	useFrame(() => {
		groups.current.forEach((group, index) => {
			if (!group) return;
			const carton = state.current.cartons[index];
			group.visible = !!carton && carton.scale > 0;
			if (!carton) return;
			const height = carton.tall ? HIGH_HEIGHT : LOW_HEIGHT;
			group.position.set(
				carton.x,
				0.05 + (height * carton.scale) / 2,
				carton.z,
			);
			group.scale.set(carton.scale, carton.scale, carton.scale);
		});
	});

	return (
		<>
			{[false, true].map((tall, index) => (
				<group
					key={index}
					visible={false}
					ref={(group) => {
						groups.current[index] = group;
					}}
				>
					<mesh>
						<boxGeometry
							args={[CHANNEL_WIDTH, tall ? HIGH_HEIGHT : LOW_HEIGHT, T1_WIDTH]}
						/>
						<meshStandardMaterial color={tall ? HIGH_COLOR : LOW_COLOR} />
					</mesh>
				</group>
			))}
		</>
	);
}

function Plant() {
	const state = useRef<HeroSceneState>(sampleHeroScene(0));
	useFrame(({ clock }) => {
		state.current = sampleHeroScene(clock.getElapsedTime());
	});
	const outputX = T1_END_X + OUTPUT_LENGTH / 2;
	const sideBodyEnd = STATION_X - 1.3 + 0.5;

	return (
		<group>
			<Conveyor
				center={[(T1_START_X + T1_END_X) / 2, 0, 0]}
				axis="x"
				length={T1_END_X - T1_START_X}
				width={T1_WIDTH}
				running={(s) => s.t1Running}
				color="#5f6b73"
				slatColor="#3b444a"
				state={state}
			/>
			<Conveyor
				center={[STATION_X, 0, (CHANNEL_START_Z + CHANNEL_END_Z) / 2]}
				axis="z"
				length={CHANNEL_END_Z - CHANNEL_START_Z}
				width={CHANNEL_WIDTH}
				running={(s) => s.t2Running}
				color="#cfd8dc"
				slatColor="#90a4ae"
				state={state}
			/>
			<mesh position={[outputX, 0, LOW_Z]}>
				<boxGeometry args={[OUTPUT_LENGTH, 0.06, T1_WIDTH]} />
				<meshStandardMaterial color={LOW_COLOR} />
			</mesh>
			<mesh position={[outputX, 0, HIGH_Z]}>
				<boxGeometry args={[OUTPUT_LENGTH, 0.06, T1_WIDTH]} />
				<meshStandardMaterial color={HIGH_COLOR} />
			</mesh>
			<Pusher
				axis="z"
				across={STATION_X}
				bodyEnd={-0.65}
				frontAtRest={-T1_WIDTH / 2}
				stroke={(s) => s.p1}
				color="#546e7a"
				state={state}
			/>
			<Pusher
				axis="x"
				across={LOW_Z}
				bodyEnd={sideBodyEnd}
				frontAtRest={STATION_X - CHANNEL_WIDTH / 2}
				stroke={(s) => s.p2}
				color="#607d8b"
				state={state}
			/>
			<Pusher
				axis="x"
				across={HIGH_Z}
				bodyEnd={sideBodyEnd}
				frontAtRest={STATION_X - CHANNEL_WIDTH / 2}
				stroke={(s) => s.p3}
				color="#607d8b"
				state={state}
			/>
			<Cartons state={state} />
		</group>
	);
}

/** Aims the camera at the plant and shifts the picture right without changing its perspective. */
function Framing() {
	const camera = useThree((state) => state.camera);
	const { width, height } = useThree((state) => state.size);

	useLayoutEffect(() => {
		camera.lookAt(...CAMERA_TARGET);
		if ("setViewOffset" in camera) {
			camera.setViewOffset(
				width,
				height,
				-width * RIGHT_SHIFT,
				0,
				width,
				height,
			);
		}
	}, [camera, width, height]);

	return null;
}

/** Looping, scripted 3D sorting station drawn as the backdrop of the landing hero. */
export default function HeroScene({ paused }: { paused: boolean }) {
	return (
		<Canvas
			frameloop={paused ? "never" : "always"}
			dpr={[1, 1.5]}
			camera={{ position: [9.6, 5.4, 8.6], fov: 40 }}
			style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
		>
			<Framing />
			<ambientLight intensity={0.7} />
			<directionalLight position={[5, 8, 4]} intensity={1.2} />
			<Plant />
			<gridHelper
				args={[30, 30, "#cfd8dc", "#e3e8eb"]}
				position={[3.5, -0.06, 1.5]}
			/>
		</Canvas>
	);
}
