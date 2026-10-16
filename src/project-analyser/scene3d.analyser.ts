import { getSceneDescriptor } from "@/3d-scenes/scene.registry";
import { getExpectedZones } from "@/3d-scenes/scene3d-wiring";
import type Project from "@/schemas/project/project.schema";
import { VARIABLE_TYPE_TO_NATIVE_TYPE } from "@/schemas/variable/variable.schema";
import CrossReferenceCollector from "./cross-reference/cross-reference-collector";
import ProjectAnalyserIssue from "./project.analyser.issue";

const NOT_COMPATIBLE_ZONE_CODES = {
	sensor: "SCENE3D_SENSOR_NOT_INPUT",
	actuator: "SCENE3D_ACTUATOR_NOT_OUTPUT",
	display: "SCENE3D_DISPLAY_NOT_MEMORY",
} as const;

/**
 * Checks the wiring of the 3D scene of the project against the catalogue: every bound point must
 * target an existing variable of the right zone and type, and a sensor must be the only source
 * of its input.
 */
export default function analyseScene3d(
	project: Project,
): ProjectAnalyserIssue[] {
	const scene = project.scene3d;
	if (!scene) return [];

	const source = { sourceType: "project", sourceId: project.id } as const;
	const descriptor = getSceneDescriptor(scene.sceneId, scene.sceneVersion);
	if (!descriptor) {
		return [
			new ProjectAnalyserIssue("error", "SCENE3D_UNKNOWN", source, {
				sceneId: scene.sceneId,
			}),
		];
	}

	const issues: ProjectAnalyserIssue[] = [];
	const variablesById = new Map(project.variables.map((v) => [v.id, v]));
	const sensorsByVariableId = new Map<string, string[]>();

	for (const point of descriptor.points) {
		const variableId = scene.bindings[point.id];
		const params = { point: point.suggestedMnemonic };
		if (!variableId) {
			issues.push(
				new ProjectAnalyserIssue(
					"warning",
					"SCENE3D_POINT_UNBOUND",
					source,
					params,
				),
			);
			continue;
		}
		const variable = variablesById.get(variableId);
		if (!variable) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"SCENE3D_BINDING_VARIABLE_MISSING",
					source,
					params,
				),
			);
			continue;
		}

		const variableParams = { ...params, variableName: variable.mnemonic };
		if (!getExpectedZones(point.kind).includes(variable.zone)) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					NOT_COMPATIBLE_ZONE_CODES[point.kind],
					source,
					variableParams,
				),
			);
			continue;
		}
		if (VARIABLE_TYPE_TO_NATIVE_TYPE[variable.type] !== point.valueType) {
			issues.push(
				new ProjectAnalyserIssue("error", "SCENE3D_TYPE_MISMATCH", source, {
					...variableParams,
					variableType: variable.type,
					expectedType: point.valueType,
				}),
			);
			continue;
		}
		if (point.kind === "sensor") {
			sensorsByVariableId.set(variableId, [
				...(sensorsByVariableId.get(variableId) ?? []),
				point.suggestedMnemonic,
			]);
			if (project.hardwareTarget && variable.address) {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"SCENE3D_SENSOR_ALSO_ON_PIN",
						source,
						{ ...variableParams, address: variable.address },
					),
				);
			}
		}
	}

	for (const [variableId, points] of sensorsByVariableId) {
		if (points.length < 2) continue;
		issues.push(
			new ProjectAnalyserIssue("error", "SCENE3D_SENSOR_DUPLICATE", source, {
				variableName: variablesById.get(variableId)!.mnemonic,
				points: points.join(", "),
			}),
		);
	}

	issues.push(...analyseWrittenSensors(project, sensorsByVariableId, source));
	return issues;
}

/** A widget writing an input driven by a sensor: its writes are ignored during the simulation. */
function analyseWrittenSensors(
	project: Project,
	sensorsByVariableId: Map<string, string[]>,
	source: { sourceType: "project"; sourceId: string },
): ProjectAnalyserIssue[] {
	const sensorNames = new Set(
		[...sensorsByVariableId.keys()].map(
			(id) => project.variables.find((v) => v.id === id)!.mnemonic,
		),
	);
	if (sensorNames.size === 0) return [];
	return CrossReferenceCollector.collect(project)
		.filter(
			({ variableName, references }) =>
				sensorNames.has(variableName) &&
				references.some(
					(reference) =>
						reference.programType === "hmi" && reference.access === "write",
				),
		)
		.map(
			({ variableName }) =>
				new ProjectAnalyserIssue(
					"warning",
					"SCENE3D_SENSOR_WRITTEN_BY_HMI",
					source,
					{ variableName },
				),
		);
}
