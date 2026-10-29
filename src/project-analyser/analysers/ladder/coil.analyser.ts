import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
import {
	CoilElement,
	isOverwritingCoilType,
} from "@/schemas/ladder/element.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Project from "@/schemas/project/project.schema";
import LadderElementAnalyser, {
	checkBooleanVariable,
	checkHasPredecessor,
	LadderVariablesContext,
} from "./element.analyser";

export default class CoilAnalyser extends LadderElementAnalyser<CoilElement> {
	analyseIsolated(_element: CoilElement): ProjectAnalyserIssue[] {
		return [];
	}

	analyseInContext(
		element: CoilElement,
		ladder: Ladder,
		{ variablesByMnemonic }: LadderVariablesContext,
		_project: Project,
	): ProjectAnalyserIssue[] {
		const source = {
			sourceType: "ladder-coil",
			sourceId: element.id,
			parentId: ladder.id,
		} as const;
		const variable = variablesByMnemonic.get(element.data.variable);
		const issues: ProjectAnalyserIssue[] = [];

		const variableIssue = checkBooleanVariable(
			element.data.variable,
			variablesByMnemonic,
			source,
			{
				noVariable: "LADDER_COIL_NO_VARIABLE",
				undeclared: "LADDER_COIL_VARIABLE_UNDECLARED",
				notBoolean: "LADDER_COIL_VARIABLE_NOT_BOOLEAN",
			},
		);
		if (variableIssue) issues.push(variableIssue);

		if (variable) {
			if (variable.zone === "constant") {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"LADDER_COIL_VARIABLE_IS_CONSTANT",
						source,
						{ variableName: element.data.variable },
					),
				);
			}
			if (variable.getDirection() === "IN") {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"LADDER_COIL_VARIABLE_IS_INPUT",
						source,
						{ variableName: element.data.variable },
					),
				);
			}
		}

		const predecessorIssue = checkHasPredecessor(element, ladder, source);
		if (predecessorIssue) issues.push(predecessorIssue);

		if (isOverwritingCoilType(element.data.type)) {
			const sameVariableCoilsCount = ladder
				.getAllElements()
				.filter(
					(el) =>
						el.type === "coil" &&
						isOverwritingCoilType(el.data.type) &&
						el.data.variable === element.data.variable,
				).length;
			if (sameVariableCoilsCount > 1) {
				issues.push(
					new ProjectAnalyserIssue(
						"warning",
						"LADDER_COIL_DUPLICATE_NORMAL_ASSIGNMENT",
						source,
						{
							variableName: element.data.variable,
							count: sameVariableCoilsCount,
						},
					),
				);
			}
		}

		return issues;
	}
}
