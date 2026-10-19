"use client";

import CrossroadsModel, {
	ROAD_HALF,
	type CrossroadsState,
} from "@/3d-scenes/crossroads/v1/crossroads.model";
import Box from "@/ui/components/3d-scene/parts/Box";
import CrossroadsCars from "@/ui/components/3d-scene/crossroads/v1/CrossroadsCars";
import CrossroadsLights from "@/ui/components/3d-scene/crossroads/v1/CrossroadsLights";
import CrossroadsRoad from "@/ui/components/3d-scene/crossroads/v1/CrossroadsRoad";
import { S } from "@/ui/components/3d-scene/crossroads/v1/crossroads-scale";
import { ContactShadows } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import { lightCycleAt } from "./crossroads-light-cycle";
import {
	CAMERA_DIRECTION,
	CAMERA_FOV,
	CAMERA_TARGET,
	cameraDistance,
} from "./crossroads-framing";

const STEP_MS = 20;
/** Longest frame gap replayed at once: a tab coming back from the background resumes, not catches up. */
const MAX_FRAME_MS = 100;
/** Simulated before the first frame so the roads already carry traffic. */
const WARM_UP_MS = 9000;
/** The roads end flush with the edges of the base. */
const BASE_SIZE = 2 * ROAD_HALF * S;
const BASE_THICKNESS = 0.3;
/** Top of the base, right under the road surface. */
const BASE_TOP = -0.05;
/** `pendingMs`: time not yet simulated, shorter than one step. */
type Simulation = { state: CrossroadsState; tMs: number; pendingMs: number };

function advance(simulation: Simulation, dtMs: number) {
	simulation.pendingMs += dtMs;
	while (simulation.pendingMs >= STEP_MS) {
		simulation.state = CrossroadsModel.step(
			simulation.state,
			STEP_MS,
			lightCycleAt(simulation.tMs),
		);
		simulation.tMs += STEP_MS;
		simulation.pendingMs -= STEP_MS;
	}
}

function createSimulation(): Simulation {
	const simulation = {
		state: CrossroadsModel.createState(),
		tMs: 0,
		pendingMs: 0,
	};
	advance(simulation, WARM_UP_MS);
	return simulation;
}

function Crossroads() {
	const simulation = useRef<Simulation | null>(null);
	simulation.current ??= createSimulation();

	useFrame((_, delta) => {
		if (simulation.current) {
			advance(simulation.current, Math.min(delta * 1000, MAX_FRAME_MS));
		}
	});

	return (
		<>
			<Box
				position={[0, BASE_TOP - BASE_THICKNESS / 2, 0]}
				size={[BASE_SIZE, BASE_THICKNESS, BASE_SIZE]}
				color="#fafafa"
			/>
			<CrossroadsRoad />
			<CrossroadsLights read={() => simulation.current?.state.lights ?? null} />
			<CrossroadsCars read={() => simulation.current?.state.lanes ?? null} />
		</>
	);
}

/** Backs the camera off along a fixed direction until the whole base fits the canvas. */
function Framing() {
	const camera = useThree((state) => state.camera);
	const { width, height } = useThree((state) => state.size);

	useLayoutEffect(() => {
		const distance = cameraDistance(BASE_SIZE, width, height);
		camera.position.set(
			...(CAMERA_DIRECTION.map((c, i) => CAMERA_TARGET[i] + c * distance) as [
				number,
				number,
				number,
			]),
		);
		camera.lookAt(...CAMERA_TARGET);
	}, [camera, width, height]);

	return null;
}

/** Crossroads model driven by a correct light cycle, laid on a base like a model. */
export default function CrossroadsIllustration({
	paused,
}: {
	paused: boolean;
}) {
	return (
		<Canvas
			frameloop={paused ? "never" : "always"}
			dpr={[1, 1.5]}
			camera={{ fov: CAMERA_FOV }}
			style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
		>
			<Framing />
			<ambientLight intensity={0.7} />
			<directionalLight position={[5, 8, 4]} intensity={1.2} />
			<Crossroads />
			<ContactShadows
				position={[0, BASE_TOP - BASE_THICKNESS - 0.01, 0]}
				scale={BASE_SIZE * 1.6}
				blur={2.5}
				far={1.5}
				opacity={0.35}
			/>
		</Canvas>
	);
}
