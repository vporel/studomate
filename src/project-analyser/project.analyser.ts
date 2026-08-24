import { BlockElement, UserProgramBlockParams } from "@/schemas/ladder/block.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import { ProgramType } from "@/schemas/program/program.schema";
import ProgramAnalyser from "./program.analyser";
import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";
import GrafcetAnalyser from "./analysers/grafcet/grafcet.analyser";
import LadderAnalyser from "./analysers/ladder/ladder.analyser";
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
	ladder: {
		analyse: (ladder: Ladder, project: Project) => {
			const result = LadderAnalyser.analyse(ladder, project);
			return {
				issues: result.issues,
				generatedVariables: result.generatedVariables,
				analysedElementsCount: LadderAnalyser.countLeaves(ladder),
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
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"PROJECT_MISSING_ANALYSER_FOR_NOTATION",
						{ sourceType: "project", sourceId: project.id },
						`Aucun analyseur disponible pour la notation "${program.type}" (programme "${program.name}"). Ce programme n'a pas été analysé.`,
					),
				);
				continue;
			}
			const result = analyser.analyse(program, project);
			issues.push(...result.issues);
			generatedVariablesByProgram.set(program.id, result.generatedVariables);
			totalAnalysedElements += result.analysedElementsCount;
		}

		issues.push(...this.checkDuplicateStepNumbers(generatedVariablesByProgram, project));
		issues.push(...this.checkMainUniqueness(project));
		issues.push(...this.checkOrphanLadders(project));
		issues.push(...this.checkCallCycles(project));

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

	/** Défense en profondeur : garanti par `Project.createMain`/`deleteProgram`, sauf projet importé/édité à la main. */
	private static checkMainUniqueness(project: Project): ProjectAnalyserIssue[] {
		const mains = Object.values(project.ladders).filter((ladder) => ladder.role === "main");
		if (mains.length === 1) return [];
		if (mains.length === 0) {
			return [
				new ProjectAnalyserIssue(
					"error",
					"PROJECT_MISSING_MAIN",
					{ sourceType: "project", sourceId: project.id },
					"Le projet ne porte aucun programme Main.",
				),
			];
		}
		return [
			new ProjectAnalyserIssue(
				"error",
				"PROJECT_MULTIPLE_MAINS",
				{ sourceType: "project", sourceId: project.id },
				`Le projet porte ${mains.length} programmes Main, il ne devrait en porter qu'un seul.`,
			),
		];
	}

	/**
	 * Pour chaque ladder, la liste des `programId` référencés par ses blocs `"user-program"` — les
	 * références vers un id qui n'est pas un ladder du projet sont ignorées ici (déjà signalées
	 * par `BlockAnalyser`).
	 */
	private static buildBlockReferenceGraph(project: Project): Map<string, string[]> {
		const graph = new Map<string, string[]>();
		for (const ladder of Object.values(project.ladders)) {
			const targets = ladder
				.getAllElements()
				.filter(
					(element): element is BlockElement =>
						element.type === "block" && element.data.blockType === "user-program",
				)
				.map((element) => (element.data.params as UserProgramBlockParams).programId)
				.filter((programId) => project.getLadder(programId) !== undefined);
			graph.set(ladder.id, targets);
		}
		return graph;
	}

	/**
	 * Un ladder qui n'est référencé par aucun bloc, nulle part dans le projet (ni le Main ni un
	 * autre ladder), ne s'exécute jamais — voir `checkCallCycles` pour le mécanisme d'appel.
	 * Volontairement pas de calcul d'atteignabilité transitive depuis le Main : ce n'est qu'un
	 * signal, à l'utilisateur de repérer une erreur d'assemblage.
	 */
	private static checkOrphanLadders(project: Project): ProjectAnalyserIssue[] {
		const graph = this.buildBlockReferenceGraph(project);
		const referencedIds = new Set(Array.from(graph.values()).flat());

		const issues: ProjectAnalyserIssue[] = [];
		for (const ladder of Object.values(project.ladders)) {
			if (ladder.role === "main" || referencedIds.has(ladder.id)) continue;
			issues.push(
				new ProjectAnalyserIssue(
					"warning",
					"LADDER_NOT_REFERENCED",
					{ sourceType: "ladder", sourceId: ladder.id },
					`Le ladder "${ladder.name}" n'est référencé par aucun bloc du projet : il ne s'exécutera pas.`,
				),
			);
		}
		return issues;
	}

	/**
	 * Un ladder peut référencer un autre ladder via un bloc `"user-program"`, formant un graphe
	 * d'appels — jamais de cycle autorisé (y compris l'auto-référence), sous peine de boucle
	 * infinie à l'exécution. Détection classique par coloriage (blanc/gris/noir) : un arc vers un
	 * noeud "gris" (en cours de visite) referme un cycle.
	 */
	private static checkCallCycles(project: Project): ProjectAnalyserIssue[] {
		const graph = this.buildBlockReferenceGraph(project);
		const state = new Map<string, "visiting" | "done">();
		const reportedCycles = new Set<string>();
		const issues: ProjectAnalyserIssue[] = [];

		const visit = (ladderId: string, path: string[]) => {
			state.set(ladderId, "visiting");
			for (const targetId of graph.get(ladderId) ?? []) {
				if (state.get(targetId) === "visiting") {
					const cycle = [...path.slice(path.indexOf(targetId)), targetId];
					const key = [...new Set(cycle)].sort().join(">");
					if (reportedCycles.has(key)) continue;
					reportedCycles.add(key);
					const names = cycle.map((id) => project.getProgram(id)?.name ?? id).join(" → ");
					issues.push(
						new ProjectAnalyserIssue(
							"error",
							"BLOCK_PROGRAM_CALL_CYCLE",
							{ sourceType: "project", sourceId: project.id },
							`Cycle d'appels entre ladders détecté : ${names}.`,
						),
					);
					continue;
				}
				if (!state.has(targetId)) visit(targetId, [...path, targetId]);
			}
			state.set(ladderId, "done");
		};

		for (const ladderId of graph.keys()) {
			if (!state.has(ladderId)) visit(ladderId, [ladderId]);
		}

		return issues;
	}
}
