import type Project from "@/schemas/project/project.schema";
import { validateVariable } from "@/schemas/variable/variable.validator";
import ProjectAnalyserIssue from "./project.analyser.issue";

/** Reports the constants whose declared value or address breaks the schema rules (a project
 * imported or built outside the variables grid is not guaranteed to respect them). */
export default function analyseConstants(
	project: Project,
): ProjectAnalyserIssue[] {
	return project.variables
		.filter(
			(variable) =>
				variable.zone === "constant" &&
				validateVariable(variable, project.dialect).length > 0,
		)
		.map(
			(variable) =>
				new ProjectAnalyserIssue(
					"error",
					"PROJECT_CONSTANT_INVALID",
					{ sourceType: "project", sourceId: project.id },
					{ variableName: variable.mnemonic },
				),
		);
}
