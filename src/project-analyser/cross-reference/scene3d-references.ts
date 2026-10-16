import { getSceneDescriptor } from "@/3d-scenes/scene.registry";
import { sceneKey } from "@/3d-scenes/scene.descriptor";
import type Project from "@/schemas/project/project.schema";
import type { RawReference } from "./cross-reference.types";

/**
 * References carried by the bindings of the 3D scene: a sensor writes its variable, an actuator
 * reads it. A binding to a variable that no longer exists produces nothing. Never throws.
 */
export default function collectScene3dReferences(
	project: Project,
): RawReference[] {
	const scene = project.scene3d;
	const descriptor = scene ? getSceneDescriptor(scene.sceneId, scene.sceneVersion) : undefined;
	if (!scene || !descriptor) return [];

	const references: RawReference[] = [];
	for (const point of descriptor.points) {
		const variableId = scene.bindings[point.id];
		const variable = project.variables.find((v) => v.id === variableId);
		if (!variable) continue;
		references.push({
			variableName: variable.mnemonic,
			access: point.kind === "sensor" ? "write" : "read",
			programId: sceneKey(scene.sceneId, scene.sceneVersion),
			programType: "scene3d",
			locationId: point.id,
			locationKind: "scene3d-point",
			locationParams: {},
		});
	}
	return references;
}
