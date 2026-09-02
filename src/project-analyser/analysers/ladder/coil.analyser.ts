import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
import { CoilElement } from "@/schemas/ladder/element.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";
import LadderElementAnalyser from "./element.analyser";

export default class CoilAnalyser extends LadderElementAnalyser<CoilElement> {
	analyseIsolated(_element: CoilElement): ProjectAnalyserIssue[] {
		return [];
	}

	analyseInContext(
		element: CoilElement,
		ladder: Ladder,
		variablesByMnemonic: Map<string, Variable>,
		_project: Project,
	): ProjectAnalyserIssue[] {
		const source = {
			sourceType: "ladder-coil",
			sourceId: element.id,
			parentId: ladder.id,
		} as const;
		const variable = variablesByMnemonic.get(element.data.variable);
		const issues: ProjectAnalyserIssue[] = [];

		if (!variable) {
			issues.push(
				new ProjectAnalyserIssue("error", "COIL_VARIABLE_UNDECLARED", source, {
					variableName: element.data.variable,
				}),
			);
		} else {
			if (variable.type !== "BOOL") {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"COIL_VARIABLE_NOT_BOOLEAN",
						source,
						{ variableName: element.data.variable },
					),
				);
			}
			if (variable.getDirection() === "IN") {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"COIL_VARIABLE_IS_INPUT",
						source,
						{ variableName: element.data.variable },
					),
				);
			}
		}

		const connections = ladder
			.getAllConnections()
			.map(({ connection }) => connection);
		if (
			!connections.some((connection) => connection.target.id === element.id)
		) {
			issues.push(
				new ProjectAnalyserIssue("error", "ELEMENT_NO_PREDECESSOR", source),
			);
		}

		if (element.data.type === "normal") {
			const sameVariableCoilsCount = ladder
				.getAllElements()
				.filter(
					(el) =>
						el.type === "coil" &&
						el.data.type === "normal" &&
						el.data.variable === element.data.variable,
				).length;
			if (sameVariableCoilsCount > 1) {
				issues.push(
					new ProjectAnalyserIssue(
						"warning",
						"COIL_DUPLICATE_NORMAL_ASSIGNMENT",
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
