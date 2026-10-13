import type { NativeType } from "@/schemas/variable/variable.schema";

export type ScenePointKind = "sensor" | "actuator";

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
