import CartonSortingDescriptor from "./carton-sorting/carton-sorting.descriptor";
import CartonSortingModel from "./carton-sorting/carton-sorting.model";
import CrossroadsDescriptor from "./crossroads/crossroads.descriptor";
import CrossroadsModel from "./crossroads/crossroads.model";
import DrillingDescriptor from "./drilling/drilling.descriptor";
import DrillingModel from "./drilling/drilling.model";
import ElevatorDescriptor from "./elevator/elevator.descriptor";
import ElevatorModel from "./elevator/elevator.model";
import type { SceneModel } from "./scene-model";
import type { SceneDescriptor } from "./scene.descriptor";

type RegisteredScene = {
	descriptor: SceneDescriptor;
	model: SceneModel<unknown, unknown>;
};

/** Registers a typed model under the erased signature the generic consumers (stepper, bridge) use. */
function register<State, Interaction>(
	descriptor: SceneDescriptor,
	model: SceneModel<State, Interaction>,
): RegisteredScene {
	return {
		descriptor,
		model: model as unknown as SceneModel<unknown, unknown>,
	};
}

const SCENES: RegisteredScene[] = [
	register(CartonSortingDescriptor, CartonSortingModel),
	register(CrossroadsDescriptor, CrossroadsModel),
	register(DrillingDescriptor, DrillingModel),
	register(ElevatorDescriptor, ElevatorModel),
];

export function listScenes(): readonly SceneDescriptor[] {
	return SCENES.map((scene) => scene.descriptor);
}

export function getSceneDescriptor(id: string): SceneDescriptor | undefined {
	return SCENES.find((scene) => scene.descriptor.id === id)?.descriptor;
}

export function getSceneModel(
	id: string,
): SceneModel<unknown, unknown> | undefined {
	return SCENES.find((scene) => scene.descriptor.id === id)?.model;
}
