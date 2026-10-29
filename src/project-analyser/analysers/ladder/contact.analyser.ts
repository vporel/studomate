import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
import { ContactElement } from "@/schemas/ladder/element.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Project from "@/schemas/project/project.schema";
import LadderElementAnalyser, {
	checkBooleanVariable,
	checkHasPredecessor,
	LadderVariablesContext,
} from "./element.analyser";

export default class ContactAnalyser extends LadderElementAnalyser<ContactElement> {
	analyseIsolated(_element: ContactElement): ProjectAnalyserIssue[] {
		return [];
	}

	analyseInContext(
		element: ContactElement,
		ladder: Ladder,
		{ variablesByMnemonic }: LadderVariablesContext,
		_project: Project,
	): ProjectAnalyserIssue[] {
		const source = {
			sourceType: "ladder-contact",
			sourceId: element.id,
			parentId: ladder.id,
		} as const;
		const issues: ProjectAnalyserIssue[] = [];

		const variableIssue = checkBooleanVariable(
			element.data.variable,
			variablesByMnemonic,
			source,
			{
				noVariable: "LADDER_CONTACT_NO_VARIABLE",
				undeclared: "LADDER_CONTACT_VARIABLE_UNDECLARED",
				notBoolean: "LADDER_CONTACT_VARIABLE_NOT_BOOLEAN",
			},
		);
		if (variableIssue) issues.push(variableIssue);

		const hasCoil = ladder
			.getAllConnections()
			.some(({ connection }) => connection.source.id === element.id);
		if (!hasCoil) {
			issues.push(
				new ProjectAnalyserIssue("warning", "LADDER_SECTION_NO_COIL", source),
			);
		}
		const predecessorIssue = checkHasPredecessor(element, ladder, source);
		if (predecessorIssue) issues.push(predecessorIssue);

		return issues;
	}
}
