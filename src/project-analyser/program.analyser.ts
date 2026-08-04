import Program from "@/schemas/program/program.schema";
import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";
import ProjectAnalyserIssue from "./project.analyser.issue";

/**
 * Résultat neutre de l'analyse d'un programme, quelle que soit sa notation.
 *
 * `generatedVariables` recouvre les variables synthétiques qu'une notation fabrique pour ses
 * besoins — les `X{n}` d'étape en GRAFCET. Le concept est neutre ; seul son contenu ne l'est pas.
 */
export type ProgramAnalysisResult = {
	issues: ProjectAnalyserIssue[];
	generatedVariables: Variable[];
	analysedElementsCount: number;
};

/**
 * Ce que le niveau projet attend d'une notation pour l'analyser.
 *
 * Volontairement réduit à l'essentiel : l'analyse *interne* d'un programme (ses éléments,
 * ses connexions, ses règles) reste entièrement l'affaire de la notation.
 */
export default interface ProgramAnalyser<P extends Program = Program> {
	analyse(program: P, project: Project): ProgramAnalysisResult;
}
