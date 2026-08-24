import { BLOCK_PORT_LABELS } from "@/schemas/ladder/block.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import LadderElementAnalyserFactory from "./element-analyser.factory";
import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";
import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";

export type LadderAnalysisResult = {
	issues: ProjectAnalyserIssue[];
	generatedVariables: Variable[];
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

/** `portName` est le nom déclaré par `BLOCK_PORTS` (`"EN"`, `"ENO"`, et plus tard `"PT"`, `"ET"`...). */
export function getBlockPortVariableId(ladderId: string, blockId: string, portName: string): string {
	return `ladder-${ladderId}-block-${blockId}-${portName}`;
}

/**
 * Le constructeur `Variable` valide le mnémonique quelle que soit son origine (voir
 * `Variable.validate`) — un id nanoid peut commencer par un chiffre ou contenir des tirets, d'où
 * le préfixe et leur retrait, même si ce mnémonique n'est jamais lexé depuis du texte source
 * (l'AST référençant un port de bloc est construit directement par le pré-compilateur, jamais
 * parsé).
 */
export function getBlockPortVariableMnemonic(blockId: string, portName: string): string {
	return `BLOCK_${blockId.replace(/-/g, "")}_${portName}`;
}

/**
 * Analyseur du Ladder — parcourt les éléments et connexions à plat : chaque vérification
 * structurelle se réduit à une recherche locale dans `connections`.
 */
export default class LadderAnalyser {
	static analyse(ladder: Ladder, project: Project): LadderAnalysisResult {
		const generatedVariables = [
			...this.buildEdgeMemoryVariables(ladder),
			...this.buildBlockPortVariables(ladder),
		];
		const variablesByMnemonic = new Map(
			[...project.variables, ...generatedVariables].map((v) => [v.mnemonic, v]),
		);

		const issues: ProjectAnalyserIssue[] = [];
		for (const element of ladder.getAllElements()) {
			const analyser = LadderElementAnalyserFactory.getAnalyser(element.type);
			if (analyser) {
				issues.push(...analyser.analyseIsolated(element));
				issues.push(...analyser.analyseInContext(element, ladder, variablesByMnemonic, project));
			}
		}

		return { issues, generatedVariables };
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

	/**
	 * Deux variables mémoire BOOL (entrée/sortie d'alimentation) par bloc — noms pris dans
	 * `BLOCK_PORT_LABELS[blockType]`. Les "block variables" propres à un type de bloc (ex.
	 * `PT`/`ET` d'une future tempo) sont un mécanisme séparé, pas encore implémenté.
	 */
	private static buildBlockPortVariables(ladder: Ladder): Variable[] {
		const variables: Variable[] = [];
		for (const element of ladder.getAllElements()) {
			if (element.type !== "block") continue;
			const ports = BLOCK_PORT_LABELS[element.data.blockType];
			for (const portName of [ports.input, ports.output]) {
				variables.push(
					new Variable(
						getBlockPortVariableId(ladder.id, element.id, portName),
						getBlockPortVariableMnemonic(element.id, portName),
						"memory",
						"BOOL",
					),
				);
			}
		}
		return variables;
	}
}
