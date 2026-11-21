import type Project from "@/schemas/project/project.schema";
import type Grafcet from "@/schemas/grafcet/grafcet.schema";
import Action, {
	ActionExecutionMode,
	ActionType,
} from "@/schemas/grafcet/action.schema";
import ActionHelper from "@/schemas/grafcet/helpers/action.helper";
import { identifierName } from "@/project-analyser/cross-reference/expression-refs";
import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";

/**
 * Modes writing TRUE once, at a step event. A continuous action on the same variable rewrites it
 * in the same scan (its level routine runs after every grafcet), so the value never holds. RESET
 * is left out: next to a continuous action it is redundant, not harmful.
 */
const OVERRIDDEN_MODES: ReadonlySet<ActionExecutionMode> = new Set([
	ActionExecutionMode.SET,
	ActionExecutionMode.RISING_EDGE,
	ActionExecutionMode.FALLING_EDGE,
]);

type BooleanActionWrite = {
	action: Action;
	grafcet: Grafcet;
	variableName: string;
};

function isConnectedToStep(action: Action, grafcet: Grafcet): boolean {
	try {
		return ActionHelper.getStep(action.id, grafcet) !== null;
	} catch {
		return false;
	}
}

function collectBooleanActionWrites(project: Project): BooleanActionWrite[] {
	const writes: BooleanActionWrite[] = [];
	for (const grafcet of project.getExecutedGrafcets()) {
		for (const element of grafcet.getAllElements()) {
			if (element.type !== "action") continue;
			const action = element as Action;
			if (action.data.type !== ActionType.BOOLEAN_VARIABLE) continue;
			if (!isConnectedToStep(action, grafcet)) continue;
			for (const line of action.getExpressionLines()) {
				const variableName = identifierName(line, project.dialect);
				if (variableName) writes.push({ action, grafcet, variableName });
			}
		}
	}
	return writes;
}

/** Cross-grafcet rule: a SET or edge action on a variable driven by a continuous action. */
export default function analyseContinuousStoredConflicts(
	project: Project,
): ProjectAnalyserIssue[] {
	const writes = collectBooleanActionWrites(project);
	const continuousGrafcetNamesByVariable = new Map<string, string[]>();
	for (const { action, grafcet, variableName } of writes) {
		if (action.data.executionMode !== ActionExecutionMode.CONTINUOUS) continue;
		const names = continuousGrafcetNamesByVariable.get(variableName) ?? [];
		if (!names.includes(grafcet.name)) names.push(grafcet.name);
		continuousGrafcetNamesByVariable.set(variableName, names);
	}

	return writes
		.filter(
			({ action, variableName }) =>
				action.data.executionMode !== null &&
				OVERRIDDEN_MODES.has(action.data.executionMode) &&
				continuousGrafcetNamesByVariable.has(variableName),
		)
		.map(
			({ action, grafcet, variableName }) =>
				new ProjectAnalyserIssue(
					"error",
					"ACTION_STORED_OVERRIDDEN_BY_CONTINUOUS",
					{
						sourceType: "grafcet-action",
						sourceId: action.id,
						parentId: grafcet.id,
					},
					{
						variableName,
						programNames: continuousGrafcetNamesByVariable
							.get(variableName)!
							.join(", "),
					},
				),
		);
}
