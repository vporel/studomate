import { BLOCK_PORT_LABELS, BlockElement, UserProgramBlockParams } from "@/schemas/ladder/block.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import LadderElementAnalyserFactory from "./element-analyser.factory";
import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";
import { createTimerBlockVariables } from "@/schemas/function-blocks/timer.schema";
import ProgramAnalyser from "@/project-analyser/program.analyser";
import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";

export type LadderAnalysisResult = {
	issues: ProjectAnalyserIssue[];
	analysedElementsCount: number;
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
export default class LadderAnalyser implements ProgramAnalyser<Ladder> {
	/**
	 * Les variables synthétiques générées par ce ladder (mémoire de front, ports de bloc, IN/Q/ET
	 * d'un bloc tempo...) — voir `ProgramAnalyser.generateVariables`. Pur, ne dépend que du
	 * ladder : `ProjectAnalyser` l'appelle pour TOUS les programmes avant d'analyser quiconque,
	 * pour que chaque programme puisse voir ce que les autres génèrent.
	 */
	generateVariables(ladder: Ladder): Variable[] {
		return [
			...this.buildEdgeMemoryVariables(ladder),
			...this.buildBlockPortVariables(ladder),
			...this.buildTimerLastInputVariables(ladder),
			...this.buildTimerExposedVariables(ladder),
		];
	}

	/**
	 * `allVariables` : l'ensemble complet à résoudre — `project.variables` plus les variables
	 * générées par TOUS les programmes du projet, y compris ce ladder (voir
	 * `ProgramAnalyser.analyse`/`generateVariables`).
	 */
	analyse(ladder: Ladder, project: Project, allVariables: Variable[]): LadderAnalysisResult {
		const variablesByMnemonic = new Map(allVariables.map((v) => [v.mnemonic, v]));

		const issues: ProjectAnalyserIssue[] = [];
		for (const element of ladder.getAllElements()) {
			const analyser = LadderElementAnalyserFactory.getAnalyser(element.type);
			if (analyser) {
				issues.push(...analyser.analyseIsolated(element));
				issues.push(...analyser.analyseInContext(element, ladder, variablesByMnemonic, project));
			}
		}

		return { issues, analysedElementsCount: this.countLeaves(ladder) };
	}

	countLeaves(ladder: Ladder): number {
		return ladder.getAllElements().length;
	}

	/**
	 * Défense en profondeur : garanti par `Project.createMain`/`deleteProgram`, sauf projet
	 * importé/édité à la main. Statique (et pas une méthode d'instance) : porte sur l'ensemble des
	 * ladders du projet, pas sur un seul — appelée une fois par `ProjectAnalyser`.
	 */
	static checkMainUniqueness(project: Project): ProjectAnalyserIssue[] {
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
	 * signal, à l'utilisateur de repérer une erreur d'assemblage. Statique : porte sur l'ensemble
	 * des ladders du projet.
	 */
	static checkOrphanLadders(project: Project): ProjectAnalyserIssue[] {
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
	 * noeud "gris" (en cours de visite) referme un cycle. Statique : porte sur l'ensemble des
	 * ladders du projet.
	 */
	static checkCallCycles(project: Project): ProjectAnalyserIssue[] {
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

	/**
	 * Une variable mémoire cachée par contact en mode P/N, pour détecter le front — même
	 * mécanisme que les variables d'étape `Xn` du GRAFCET (`GrafcetAnalyser.buildstepsVariables`).
	 */
	private buildEdgeMemoryVariables(ladder: Ladder): Variable[] {
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
	 * `BLOCK_PORT_LABELS[blockType]`. Un bloc `"timer"` en est exclu : ses ports IN/Q sont déjà
	 * de vraies `Variable` générées à partir de sa config (`<Nom>.IN`/`<Nom>.Q`, voir
	 * `buildTimerExposedVariables`), pas des variables cachées propres à ce mécanisme.
	 */
	private buildBlockPortVariables(ladder: Ladder): Variable[] {
		const variables: Variable[] = [];
		for (const element of ladder.getAllElements()) {
			if (element.type !== "block" || element.data.blockType === "timer") continue;
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

	/**
	 * Une variable mémoire BOOL cachée par bloc timer, pour la détection de front de son `IN`
	 * (`TimerNode.lastInput`, voir `LadderPreCompiler`) — jamais exposée, contrairement à
	 * `<Nom>.IN`/`.Q`/`.ET` (voir `buildTimerExposedVariables`).
	 */
	private buildTimerLastInputVariables(ladder: Ladder): Variable[] {
		const variables: Variable[] = [];
		for (const element of ladder.getAllElements()) {
			if (element.type !== "block" || element.data.blockType !== "timer") continue;
			variables.push(
				new Variable(
					getBlockPortVariableId(ladder.id, element.id, "lastInput"),
					getBlockPortVariableMnemonic(element.id, "lastInput"),
					"memory",
					"BOOL",
				),
			);
		}
		return variables;
	}

	/**
	 * Les variables IN/Q/ET exposées d'un bloc timer (`<Nom>.IN`, `.Q`, `.ET`) — voir
	 * `createTimerBlockVariables`. Jamais persistées dans `project.variables` : générées ici à
	 * partir de la config embarquée dans l'élément, elles disparaissent avec lui.
	 */
	private buildTimerExposedVariables(ladder: Ladder): Variable[] {
		const variables: Variable[] = [];
		for (const element of ladder.getAllElements()) {
			if (element.type !== "block" || element.data.blockType !== "timer") continue;
			variables.push(...createTimerBlockVariables(element.id, element.data.params.name));
		}
		return variables;
	}
}
