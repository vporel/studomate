import type { Scene3d } from "@/schemas/3d-scene/scene3d.schema";
import type Variable from "@/schemas/variable/variable.schema";
import {
	VARIABLE_TYPE_TO_NATIVE_TYPE,
	type VariableUpdatableFields,
	type VariableZone,
} from "@/schemas/variable/variable.schema";
import type {
	SceneDescriptor,
	ScenePointDescriptor,
	ScenePointKind,
} from "./scene.descriptor";

export function getExpectedZones(kind: ScenePointKind): VariableZone[] {
	return kind === "sensor"
		? ["logic-input", "analog-input"]
		: ["logic-output", "analog-output"];
}

export function isVariableCompatible(
	point: ScenePointDescriptor,
	variable: Variable,
): boolean {
	return (
		getExpectedZones(point.kind).includes(variable.zone) &&
		VARIABLE_TYPE_TO_NATIVE_TYPE[variable.type] === point.valueType
	);
}

export function getCandidateVariables(
	point: ScenePointDescriptor,
	variables: readonly Variable[],
): Variable[] {
	return variables.filter((variable) => isVariableCompatible(point, variable));
}

function newVariableFields(
	point: ScenePointDescriptor,
): VariableUpdatableFields {
	const analog = point.valueType === "number";
	const input = point.kind === "sensor";
	return {
		mnemonic: point.suggestedMnemonic,
		zone: analog
			? input
				? "analog-input"
				: "analog-output"
			: input
				? "logic-input"
				: "logic-output",
		type: analog ? "INT" : "BOOL",
	};
}

export type MissingVariablesPlan = {
	/** Unbound points that can reuse an existing compatible variable named like the suggestion. */
	reused: Record<string, string>;
	/** Variables to create, keyed by the point they will be bound to. */
	toCreate: { pointId: string; fields: VariableUpdatableFields }[];
};

/**
 * Wiring of every unbound point of the scene: a variable already carrying the suggested mnemonic
 * is reused when compatible; otherwise it is created. A point whose suggested mnemonic belongs to
 * an incompatible variable is left unbound (the name is taken, creating it would fail).
 */
export function planMissingVariables(
	descriptor: SceneDescriptor,
	scene: Scene3d,
	variables: readonly Variable[],
): MissingVariablesPlan {
	const plan: MissingVariablesPlan = { reused: {}, toCreate: [] };
	const stillBound = new Set(
		Object.values(scene.bindings).filter((id) =>
			variables.some((v) => v.id === id),
		),
	);
	for (const point of descriptor.points) {
		const current = scene.bindings[point.id];
		if (current && variables.some((v) => v.id === current)) continue;
		const sameName = variables.find(
			(v) => v.mnemonic === point.suggestedMnemonic,
		);
		if (!sameName) {
			plan.toCreate.push({
				pointId: point.id,
				fields: newVariableFields(point),
			});
		} else if (
			isVariableCompatible(point, sameName) &&
			!stillBound.has(sameName.id)
		) {
			plan.reused[point.id] = sameName.id;
			stillBound.add(sameName.id);
		}
	}
	return plan;
}
