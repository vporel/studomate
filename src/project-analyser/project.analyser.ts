import Grafcet from "../schemas/grafcet/grafcet.schema";
import Project from "../schemas/project/project.schema";
import Variable from "../schemas/variable/variable.schema";
import GrafcetAnalyser from "./analysers/grafcet/grafcet.analyser";
import ProjectAnalyserIssue from "./project.analyser.issue";

export type ProjectAnalysisResult = {
	totalAnalysedElements: number;
	issues: ProjectAnalyserIssue[];
	/**
	 * Synthetic BOOL memory variables generated for each step with a valid number.
	 * Mnemonic pattern: X{stepNumber} — available for use in transition/action expressions.
	 */
	stepsVariables: Variable[];
};

export default class ProjectAnalyser {
	/**
	 * Analyses an entire project for structural and business rule violations.
	 * Does not evaluate or compile expressions — use ProjectCompiler for that.
	 *
	 * Returns an AnalysisResult aggregating all issues found across all grafcets,
	 * along with the synthetic step variables generated for the whole project.
	 * Analysis never throws: all problems are captured as issues.
	 */
	static analyse(project: Project): ProjectAnalysisResult {
		const issues: ProjectAnalyserIssue[] = [];
		const stepsVariablesByGrafcet = new Map<string, Variable[]>();

		let totalAnalysedElements = 0;

		for (const grafcet of Object.values(project.grafcets)) {
			const result = GrafcetAnalyser.analyse(grafcet, project);
			issues.push(...result.issues);
			stepsVariablesByGrafcet.set(grafcet.id, result.stepsVariables);
			totalAnalysedElements += grafcet.getAllElements().length;
		}

		issues.push(...this.checkDuplicateStepNumbers(stepsVariablesByGrafcet, project));

		return {
			totalAnalysedElements,
			issues,
			stepsVariables: [...stepsVariablesByGrafcet.values()].flatMap((vars) => vars),
		};
	}

	/**
	 * Cross-grafcet rule: a step number must be unique across all grafcets of a project.
	 * Uses the already-computed stepsVariables (one mnemonic = one valid unique number per grafcet).
	 * Detection: total mnemonic count vs Set size — if they differ, duplicates exist across grafcets.
	 * Emits one project-level issue per duplicated number, listing the involved grafcet names.
	 */
	private static checkDuplicateStepNumbers(
		stepsVariablesByGrafcet: Map<string, Variable[]>,
		project: Project,
	): ProjectAnalyserIssue[] {
		const allMnemonics = [...stepsVariablesByGrafcet.values()].flatMap((vars) =>
			vars.map((v) => v.mnemonic),
		);

		// Quick exit: no cross-grafcet duplicates
		if (new Set(allMnemonics).size === allMnemonics.length) return [];

		// Build mnemonic → grafcet names mapping
		const mnemonicToGrafcetNames = new Map<string, string[]>();
		for (const [grafcetId, vars] of stepsVariablesByGrafcet) {
			const grafcetName = (project.grafcets as Record<string, Grafcet>)[grafcetId].name;
			for (const variable of vars) {
				if (!mnemonicToGrafcetNames.has(variable.mnemonic))
					mnemonicToGrafcetNames.set(variable.mnemonic, []);
				mnemonicToGrafcetNames.get(variable.mnemonic)!.push(grafcetName);
			}
		}

		const issues: ProjectAnalyserIssue[] = [];
		for (const [mnemonic, grafcetNames] of mnemonicToGrafcetNames) {
			if (grafcetNames.length < 2) continue;
			const stepNumber = parseInt(mnemonic.slice(1)); // X{n} → n
			const names = grafcetNames.map((n) => `"${n}"`).join(", ");
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					{ sourceType: "project", sourceId: project.id },
					`Le numéro d'étape ${stepNumber} est utilisé dans plusieurs grafcets du projet : ${names}. Chaque numéro d'étape doit être unique à l'échelle du projet.`,
				),
			);
		}
		return issues;
	}
}
