import interpolateCartonSorting from "@/3d-scenes/carton-sorting/carton-sorting.interpolation";
import interpolateCrossroads from "@/3d-scenes/crossroads/crossroads.interpolation";
import interpolateDrilling from "@/3d-scenes/drilling/drilling.interpolation";
import interpolateElevator from "@/3d-scenes/elevator/elevator.interpolation";
import type { ComponentType } from "react";
import CartonSortingScene from "./carton-sorting/CartonSortingScene";
import CrossroadsScene from "./crossroads/CrossroadsScene";
import DrillingScene from "./drilling/DrillingScene";
import ElevatorScene from "./elevator/ElevatorScene";

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
};

const SCENE_VIEWS: Record<string, SceneViewDefinition> = {
	"carton-sorting": {
		interpolate: interpolateCartonSorting as SceneViewDefinition["interpolate"],
		Component: CartonSortingScene,
	},
	crossroads: {
		interpolate: interpolateCrossroads as SceneViewDefinition["interpolate"],
		Component: CrossroadsScene,
	},
	drilling: {
		interpolate: interpolateDrilling as SceneViewDefinition["interpolate"],
		Component: DrillingScene,
		camera: { position: [6.8, 3, 7], target: [4, 1.4, 1.5] },
	},
	elevator: {
		interpolate: interpolateElevator as SceneViewDefinition["interpolate"],
		Component: ElevatorScene,
		camera: { position: [7, 3.4, 8.5], target: [4, 1.7, 1.5] },
	},
};

export function getSceneViewDefinition(
	sceneId: string,
): SceneViewDefinition | undefined {
	return SCENE_VIEWS[sceneId];
}
