import Program from "@/schemas/program/program.schema";
import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";
import ProjectAnalyserIssue from "./project.analyser.issue";

/**
 * Résultat neutre de l'analyse d'un programme, quelle que soit sa notation.
 */
export type ProgramAnalysisResult = {
	issues: ProjectAnalyserIssue[];
	analysedElementsCount: number;
};

/**
 * Ce que le niveau projet attend d'une notation pour l'analyser.
 *
 * Volontairement réduit à l'essentiel : l'analyse *interne* d'un programme (ses éléments,
 * ses connexions, ses règles) reste entièrement l'affaire de la notation.
 *
 * Deux méthodes séparées, dans cet ordre d'appel côté `ProjectAnalyser` :
 * - `generateVariables` : les variables synthétiques que ce programme fabrique pour ses besoins
 *   (les `X{n}` d'étape en GRAFCET, `<Nom>.IN/.Q/.ET` d'un bloc tempo en Ladder...). Pure, ne
 *   dépend que du programme — appelée pour TOUS les programmes du projet avant que quiconque ne
 *   soit analysé.
 * - `analyse` : la validation proprement dite. `allVariables` est l'ensemble complet à résoudre —
 *   `project.variables` plus les variables générées par TOUS les programmes du projet (y compris
 *   celui-ci, voir `generateVariables`) — pour qu'une référence à une variable générée par un
 *   AUTRE programme (ex. `Tempo1.Q` d'un bloc tempo posé dans un autre ladder) ne soit jamais
 *   signalée à tort comme non déclarée.
 * - `crossProgramChecks` (optionnelle) : les règles qui portent sur l'ensemble des programmes de
 *   cette notation et non sur un seul (unicité d'un numéro d'étape entre grafcets, unicité du
 *   Main, cycles d'appel entre ladders...). Appelée une fois par `ProjectAnalyser` après la passe
 *   `analyse`, une seule fois par notation. Absente pour une notation sans règle de ce genre.
 */
export default interface ProgramAnalyser<P extends Program = Program> {
	generateVariables(program: P): Variable[];
	analyse(
		program: P,
		project: Project,
		allVariables: Variable[],
	): ProgramAnalysisResult;
	crossProgramChecks?(
		project: Project,
		generatedVariablesByProgram: Map<string, Variable[]>,
	): ProjectAnalyserIssue[];
}
