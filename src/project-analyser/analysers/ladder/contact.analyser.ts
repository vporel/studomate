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
					"LADDER_CONTACT_VARIABLE_UNDECLARED",
					source,
					{ variableName: element.data.variable },
				),
			);
		} else if (variable.type !== "BOOL") {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"LADDER_CONTACT_VARIABLE_NOT_BOOLEAN",
					source,
					{ variableName: element.data.variable },
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
				new ProjectAnalyserIssue("warning", "LADDER_NETWORK_NO_COIL", source),
			);
		}
		if (
			!connections.some((connection) => connection.target.id === element.id)
		) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"LADDER_ELEMENT_NO_PREDECESSOR",
					source,
				),
			);
		}

		return issues;
	}
}
