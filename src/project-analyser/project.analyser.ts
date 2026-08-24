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
	 * Toutes les variables synthétiques générées par tous les programmes du projet — les `X{n}`
	 * d'étape en GRAFCET, mais aussi les variables de bloc en Ladder (`<Nom>.IN/.Q/.ET` d'un bloc
	 * tempo, mémoire de front, ports EN/ENO...). Ne contient PAS `project.variables` : à fusionner
	 * par l'appelant (voir `ProjectPreCompiler.preCompile`, qui attend exactement ça).
	 */
	generatedVariables: Variable[];
};

/**
 * Une entrée par notation, chaque analyseur implémentant directement `ProgramAnalyser` — en
 * ajouter une consiste à écrire son analyseur et à l'inscrire ici, rien d'autre ne change dans
 * ce fichier.
 */
const PROGRAM_ANALYSERS: Record<ProgramType, ProgramAnalyser<any>> = {
	grafcet: new GrafcetAnalyser(),
	ladder: new LadderAnalyser(),
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

		// Première passe : génère les variables synthétiques de chaque programme (X{n} d'étape,
		// `<Nom>.IN/.Q/.ET` d'un bloc tempo...), sans encore rien analyser — un programme ne peut
		// valider ses propres références qu'après avoir vu ce que TOUS les autres génèrent (voir
		// `ProgramAnalyser.generateVariables`).
		for (const program of Object.values(project.programs)) {
			const analyser = PROGRAM_ANALYSERS[program.type];
			if (!analyser) continue;
			generatedVariablesByProgram.set(program.id, analyser.generateVariables(program));
		}
		const allVariables = [...project.variables, ...[...generatedVariablesByProgram.values()].flat()];

		// Seconde passe : analyse réelle, chaque programme voyant l'ensemble complet des
		// variables du projet (les siennes propres et celles de tous les autres).
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
			const result = analyser.analyse(program, project, allVariables);
			issues.push(...result.issues);
			totalAnalysedElements += result.analysedElementsCount;
		}

		// Règles cross-programmes propres à une notation : déléguées à l'analyseur de cette
		// notation (voir `GrafcetAnalyser.checkDuplicateStepNumbers`,
		// `LadderAnalyser.checkMainUniqueness`/`checkOrphanLadders`/`checkCallCycles`).
		issues.push(...GrafcetAnalyser.checkDuplicateStepNumbers(generatedVariablesByProgram, project));
		issues.push(...LadderAnalyser.checkMainUniqueness(project));
		issues.push(...LadderAnalyser.checkOrphanLadders(project));
		issues.push(...LadderAnalyser.checkCallCycles(project));

		return {
			totalAnalysedElements,
			issues,
			generatedVariables: [...generatedVariablesByProgram.values()].flatMap((vars) => vars),
		};
	}
}
