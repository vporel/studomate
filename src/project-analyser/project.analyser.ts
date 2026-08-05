import Grafcet from "../schemas/grafcet/grafcet.schema";
import { ProgramType } from "../schemas/program/program.schema";
import ProgramAnalyser from "./program.analyser";
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

/**
 * Une entrée par notation. En ajouter une consiste à écrire son analyseur et à l'inscrire
 * ici — rien d'autre ne change dans ce fichier.
 */
const PROGRAM_ANALYSERS: Record<ProgramType, ProgramAnalyser<any>> = {
	grafcet: {
		analyse: (grafcet: Grafcet, project: Project) => {
			const result = GrafcetAnalyser.analyse(grafcet, project);
			return {
				issues: result.issues,
				generatedVariables: result.stepsVariables,
				analysedElementsCount: grafcet.getAllElements().length,
			};
		},
	},
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
		const generatedVariablesByProgram = new Map<string, Variable[]>();

		let totalAnalysedElements = 0;

		for (const program of Object.values(project.programs)) {
			const analyser = PROGRAM_ANALYSERS[program.type];
			if (!analyser) {
				console.error(`Aucun analyseur pour la notation "${program.type}"`);
				continue;
			}
			const result = analyser.analyse(program, project);
			issues.push(...result.issues);
			generatedVariablesByProgram.set(program.id, result.generatedVariables);
			totalAnalysedElements += result.analysedElementsCount;
		}

		issues.push(...this.checkDuplicateStepNumbers(generatedVariablesByProgram, project));

		return {
			totalAnalysedElements,
			issues,
			stepsVariables: [...generatedVariablesByProgram.values()].flatMap((vars) => vars),
		};
	}

	/**
	 * Cross-grafcet rule: a step number must be unique across all grafcets of a project.
	 * Uses the already-computed stepsVariables (one mnemonic = one valid unique number per grafcet).
	 * Detection: total mnemonic count vs Set size — if they differ, duplicates exist across grafcets.
	 * Emits one project-level issue per duplicated number, listing the involved grafcet names.
	 */
	private static checkDuplicateStepNumbers(
		generatedVariablesByProgram: Map<string, Variable[]>,
		project: Project,
	): ProjectAnalyserIssue[] {
		const allMnemonics = [...generatedVariablesByProgram.values()].flatMap((vars) =>
			vars.map((v) => v.mnemonic),
		);

		// Quick exit: no cross-grafcet duplicates
		if (new Set(allMnemonics).size === allMnemonics.length) return [];

		// Build mnemonic → grafcet names mapping
		const mnemonicToGrafcetNames = new Map<string, string[]>();
		for (const [grafcetId, vars] of generatedVariablesByProgram) {
			const grafcetName = project.getProgram(grafcetId)?.name ?? grafcetId;
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
					"PROJECT_DUPLICATE_STEP_NUMBER_ACROSS_GRAFCETS",
					{ sourceType: "project", sourceId: project.id },
					`Le numéro d'étape ${stepNumber} est utilisé dans plusieurs grafcets du projet : ${names}. Chaque numéro d'étape doit être unique à l'échelle du projet.`,
				),
			);
		}
		return issues;
	}
}
