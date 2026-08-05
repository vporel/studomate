import Ladder from "@/schemas/ladder/ladder.schema";
import LadderElementAnalyserFactory from "./element-analyser.factory";
import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";
import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";

export type LadderAnalysisResult = {
	issues: ProjectAnalyserIssue[];
	edgeMemoryVariables: Variable[];
};

export function getContactMemoryVariableId(ladderId: string, contactId: string): string {
	return `ladder-${ladderId}-edge-${contactId}`;
}

/**
 * Un mnémonique valide doit commencer par une lettre et ne contenir que des lettres, chiffres
 * et underscores (voir `Variable.validateMnemonic`) — l'id nanoid d'un contact peut contenir
 * des tirets, d'où le préfixe et le retrait des tirets.
 */
export function getContactMemoryVariableMnemonic(contactId: string): string {
	return `EDGE_${contactId.replace(/-/g, "")}`;
}

/**
 * Analyseur du Ladder — parcourt les éléments et connexions à plat : chaque vérification
 * structurelle se réduit à une recherche locale dans `connections`.
 */
export default class LadderAnalyser {
	static analyse(ladder: Ladder, project: Project): LadderAnalysisResult {
		const edgeMemoryVariables = this.buildEdgeMemoryVariables(ladder);
		const variablesByMnemonic = new Map(
			[...project.variables, ...edgeMemoryVariables].map((v) => [v.mnemonic, v]),
		);

		const issues: ProjectAnalyserIssue[] = [];
		for (const element of ladder.getAllElements()) {
			const analyser = LadderElementAnalyserFactory.getAnalyser(element.type);
			if (analyser) {
				issues.push(...analyser.analyseIsolated(element));
				issues.push(...analyser.analyseInContext(element, ladder, variablesByMnemonic));
			}
		}

		return { issues, edgeMemoryVariables };
	}

	static countLeaves(ladder: Ladder): number {
		return ladder.getAllElements().length;
	}

	/**
	 * Une variable mémoire cachée par contact en mode P/N, pour détecter le front — même
	 * mécanisme que les variables d'étape `Xn` du GRAFCET (`GrafcetAnalyser.buildstepsVariables`).
	 */
	private static buildEdgeMemoryVariables(ladder: Ladder): Variable[] {
		const variables: Variable[] = [];
		for (const element of ladder.getAllElements()) {
			if (element.type === "contact" && (element.data.mode === "P" || element.data.mode === "N")) {
				variables.push(
					new Variable(
						getContactMemoryVariableId(ladder.id, element.id),
						getContactMemoryVariableMnemonic(element.id),
						"memory",
						"BOOL",
					),
				);
			}
		}
		return variables;
	}


}
