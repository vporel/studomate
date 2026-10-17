import CartonSortingDescriptor from "./carton-sorting/v1/carton-sorting.descriptor";
import CartonSortingModel from "./carton-sorting/v1/carton-sorting.model";
import CrossroadsDescriptor from "./crossroads/v1/crossroads.descriptor";
import CrossroadsModel from "./crossroads/v1/crossroads.model";
import DrillingDescriptor from "./drilling/v1/drilling.descriptor";
import DrillingModel from "./drilling/v1/drilling.model";
import ElevatorDescriptor from "./elevator/v1/elevator.descriptor";
import ElevatorModel from "./elevator/v1/elevator.model";
import ParkingDescriptor from "./parking/v1/parking.descriptor";
import ParkingModel from "./parking/v1/parking.model";
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
	register(ParkingDescriptor, ParkingModel),
];

function find(id: string, version: number): RegisteredScene | undefined {
	return SCENES.find(
		(scene) =>
			scene.descriptor.id === id && scene.descriptor.version === version,
	);
}

/** The latest version of each scene: the ones offered when attaching a scene to a project. */
export function listScenes(): readonly SceneDescriptor[] {
	const latest = new Map<string, SceneDescriptor>();
	for (const { descriptor } of SCENES) {
		const current = latest.get(descriptor.id);
		if (!current || descriptor.version > current.version) {
			latest.set(descriptor.id, descriptor);
		}
	}
	return [...latest.values()];
}

/** Released versions of a scene, ascending; empty for an unknown scene. */
export function listSceneVersions(id: string): number[] {
	return SCENES.filter((scene) => scene.descriptor.id === id)
		.map((scene) => scene.descriptor.version)
		.sort((a, b) => a - b);
}

export function getSceneDescriptor(
	id: string,
	version: number,
): SceneDescriptor | undefined {
	return find(id, version)?.descriptor;
}

export function getSceneModel(
	id: string,
	version: number,
): SceneModel<unknown, unknown> | undefined {
	return find(id, version)?.model;
}
