import type Project from "@/schemas/project/project.schema";
import { validateVariable } from "@/schemas/variable/variable.validator";
import ProjectAnalyserIssue from "./project.analyser.issue";

/**
 * Reports the project's variables that break the schema rules, and the mnemonics declared more
 * than once. The variables grid and the schema constructor enforce both, but a project imported
 * or edited outside the interface is not guaranteed to respect them.
 *
 * Constants are left to `analyseConstants`, so an invalid constant is not reported twice.
 */
export default function analyseVariables(
	project: Project,
): ProjectAnalyserIssue[] {
	const source = { sourceType: "project", sourceId: project.id } as const;
	const issues: ProjectAnalyserIssue[] = [];

	for (const variable of project.variables) {
		if (variable.zone === "constant") continue;
		for (const reason of validateVariable(variable, project.dialect)) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"PROJECT_VARIABLE_INVALID",
					source,
					{ variableName: variable.mnemonic },
					reason,
				),
			);
		}
	}

	const countByMnemonic = new Map<string, number>();
	for (const { mnemonic } of project.variables) {
		countByMnemonic.set(mnemonic, (countByMnemonic.get(mnemonic) ?? 0) + 1);
	}
	for (const [variableName, count] of countByMnemonic) {
		if (count > 1)
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"PROJECT_VARIABLE_MNEMONIC_DUPLICATE",
					source,
					{ variableName, count },
				),
			);
	}
	return issues;
}
