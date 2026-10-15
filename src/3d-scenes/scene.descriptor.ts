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
	labelKey: string;
	descriptionKey: string;
	points: ScenePointDescriptor[];
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
