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
		const source = { sourceType: "ladder-coil", sourceId: element.id, parentId: ladder.id } as const;
		const variable = variablesByMnemonic.get(element.data.variable);
		const issues: ProjectAnalyserIssue[] = [];

		if (!variable) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"COIL_VARIABLE_UNDECLARED",
					source,
					`La variable "${element.data.variable}" n'est pas déclarée.`,
				),
			);
		} else {
			if (variable.type !== "BOOL") {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"COIL_VARIABLE_NOT_BOOLEAN",
						source,
						`La variable "${element.data.variable}" doit être booléenne.`,
					),
				);
			}
			if (variable.getDirection() === "IN") {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"COIL_VARIABLE_IS_INPUT",
						source,
						`La bobine ne peut pas modifier la variable "${element.data.variable}" car c'est une variable d'entrée.`,
					),
				);
			}
		}

		const connections = ladder.getAllConnections().map(({ connection }) => connection);
		if (!connections.some((connection) => connection.target.id === element.id)) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"ELEMENT_NO_PREDECESSOR",
					source,
					"Cet élément n'est relié à aucun élément précédent ni au rail d'alimentation.",
				),
			);
		}

		if (element.data.mode === "normal") {
			const sameVariableCoilsCount = ladder.getAllElements().filter(
				(el) =>
					el.type === "coil" &&
					el.data.mode === "normal" &&
					el.data.variable === element.data.variable,
			).length;
			if (sameVariableCoilsCount > 1) {
				issues.push(
					new ProjectAnalyserIssue(
						"warning",
						"COIL_DUPLICATE_NORMAL_ASSIGNMENT",
						source,
						`La variable "${element.data.variable}" est pilotée par ${sameVariableCoilsCount} bobines normales distinctes.`,
					),
				);
			}
		}

		return issues;
	}
}
