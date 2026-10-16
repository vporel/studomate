import type { NativeType } from "@/schemas/variable/variable.schema";

/**
 * `sensor`: the scene drives an input variable. `actuator`: an output variable drives the scene.
 * `display`: the scene shows the value of a memory variable.
 */
export type ScenePointKind = "sensor" | "actuator" | "display";

export type ScenePointValue = boolean | number;

export interface ScenePointDescriptor {
	/** Stable key of the point inside its scene: bindings and model records use it. */
	id: string;
	kind: ScenePointKind;
	valueType: NativeType;
	labelKey: string;
	suggestedMnemonic: string;
}

/**
 * Static description of a scene: never persisted in a project. Label and description keys
 * belong to the `scene3d` i18n namespace.
 */
export interface SceneDescriptor {
	id: string;
	/**
	 * Behaviour version of the scene, starting at 1. A project pins the version it was created
	 * with; a released version is frozen (its model, points and thresholds never change).
	 */
	version: number;
	labelKey: string;
	descriptionKey: string;
	/** Screenshot of this version of the scene, served from `public/`. */
	imageUrl: string;
	points: ScenePointDescriptor[];
}

/** Unique key of one version of a scene. */
export function sceneKey(id: string, version: number): string {
	return `${id}@${version}`;
}

/** Inverse of `sceneKey`; `null` when `key` is not one. */
export function parseSceneKey(
	key: string,
): { id: string; version: number } | null {
	const separator = key.lastIndexOf("@");
	const version = Number(key.slice(separator + 1));
	if (separator <= 0 || !Number.isInteger(version)) return null;
	return { id: key.slice(0, separator), version };
}

/** Builds the point factory of a scene: label keys are `${labelPrefix}.${id}`. */
export function createPointFactory(labelPrefix: string) {
	return (
		id: string,
		kind: ScenePointKind,
		valueType: NativeType,
		suggestedMnemonic: string,
	): ScenePointDescriptor => ({
		id,
		kind,
		valueType,
		labelKey: `${labelPrefix}.${id}`,
		suggestedMnemonic,
	});
}
