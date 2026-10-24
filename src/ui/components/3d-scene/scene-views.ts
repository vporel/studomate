import interpolateCartonSorting from "@/3d-scenes/carton-sorting/v1/carton-sorting.interpolation";
import interpolateCrossroads from "@/3d-scenes/crossroads/v1/crossroads.interpolation";
import interpolateDrilling from "@/3d-scenes/drilling/v1/drilling.interpolation";
import interpolateElevator from "@/3d-scenes/elevator/v1/elevator.interpolation";
import interpolateParking from "@/3d-scenes/parking/v1/parking.interpolation";
import { sceneKey } from "@/3d-scenes/scene.descriptor";
import type { ComponentType } from "react";
import CartonSortingControls from "./carton-sorting/v1/CartonSortingControls";
import CartonSortingScene from "./carton-sorting/v1/CartonSortingScene";
import CrossroadsScene from "./crossroads/v1/CrossroadsScene";
import DrillingControls from "./drilling/v1/DrillingControls";
import DrillingScene from "./drilling/v1/DrillingScene";
import ElevatorControls from "./elevator/v1/ElevatorControls";
import ElevatorScene from "./elevator/v1/ElevatorScene";
import ParkingControls from "./parking/v1/ParkingControls";
import ParkingScene from "./parking/v1/ParkingScene";

export type SceneComponentProps = {
	/** Latest model state of the scene, blended for the current frame. */
	sample: () => unknown;
	/** True while the simulation runs: only then do the 3D controls reach the model. */
	interactive: boolean;
	send: (interaction: unknown) => void;
};

export type SceneCamera = {
	position: [number, number, number];
	target: [number, number, number];
};

type SceneViewDefinition = {
	/** Initial point of view; the default one frames a scene laid out around [4, 0, 1.5]. */
	camera?: SceneCamera;
	interpolate: (from: unknown, to: unknown, ratio: number) => unknown;
	Component: ComponentType<SceneComponentProps>;
	/** Operator controls, drawn in a fixed panel over the canvas so that the camera never moves them. */
	Controls?: ComponentType<SceneComponentProps>;
};

const SCENE_VIEWS: Record<string, SceneViewDefinition> = {
	[sceneKey("carton-sorting", 1)]: {
		interpolate: interpolateCartonSorting as SceneViewDefinition["interpolate"],
		Component: CartonSortingScene,
		Controls: CartonSortingControls,
	},
	[sceneKey("crossroads", 1)]: {
		interpolate: interpolateCrossroads as SceneViewDefinition["interpolate"],
		Component: CrossroadsScene,
	},
	[sceneKey("drilling", 1)]: {
		interpolate: interpolateDrilling as SceneViewDefinition["interpolate"],
		Component: DrillingScene,
		Controls: DrillingControls,
		camera: { position: [6.8, 3, 7], target: [4, 1.4, 1.5] },
	},
	[sceneKey("elevator", 1)]: {
		interpolate: interpolateElevator as SceneViewDefinition["interpolate"],
		Component: ElevatorScene,
		Controls: ElevatorControls,
		camera: { position: [7, 3.4, 8.5], target: [4, 1.7, 1.5] },
	},
	[sceneKey("parking", 1)]: {
		interpolate: interpolateParking as SceneViewDefinition["interpolate"],
		Component: ParkingScene,
		Controls: ParkingControls,
		camera: { position: [9.45, 6, 8], target: [5.7, 0, 1.5] },
	},
};

export function getSceneViewDefinition(
	sceneId: string,
	sceneVersion: number,
): SceneViewDefinition | undefined {
	return SCENE_VIEWS[sceneKey(sceneId, sceneVersion)];
}
