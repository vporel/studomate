import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
import { ContactElement } from "@/schemas/ladder/element.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";
import LadderElementAnalyser from "./element.analyser";

export default class ContactAnalyser extends LadderElementAnalyser<ContactElement> {
	analyseIsolated(_element: ContactElement): ProjectAnalyserIssue[] {
		return [];
	}

	analyseInContext(
		element: ContactElement,
		ladder: Ladder,
		variablesByMnemonic: Map<string, Variable>,
		_project: Project,
	): ProjectAnalyserIssue[] {
		const source = {
			sourceType: "ladder-contact",
			sourceId: element.id,
			parentId: ladder.id,
		} as const;
		const variable = variablesByMnemonic.get(element.data.variable);
		const issues: ProjectAnalyserIssue[] = [];

		if (!variable) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"CONTACT_VARIABLE_UNDECLARED",
					source,
					`La variable "${element.data.variable}" n'est pas déclarée.`,
				),
			);
		} else if (variable.type !== "BOOL") {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"CONTACT_VARIABLE_NOT_BOOLEAN",
					source,
					`La variable "${element.data.variable}" doit être booléenne.`,
				),
			);
		}

		const connections = ladder
			.getAllConnections()
			.map(({ connection }) => connection);
		if (
			!connections.some((connection) => connection.source.id === element.id)
		) {
			issues.push(
				new ProjectAnalyserIssue(
					"warning",
					"NETWORK_NO_COIL",
					source,
					"Cette branche ne pilote aucune bobine.",
				),
			);
		}
		if (
			!connections.some((connection) => connection.target.id === element.id)
		) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"ELEMENT_NO_PREDECESSOR",
					source,
					"Cet élément n'est relié à aucun élément précédent ni au rail d'alimentation.",
				),
			);
		}

		return issues;
	}
}
