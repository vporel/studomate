import { BLOCK_PORT_LABELS, BlockElement, UserProgramBlockParams } from "@/schemas/ladder/block.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import LadderElementAnalyserFactory from "./element-analyser.factory";
import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";
import { createCounterBlockVariables, getCounterBlockParams } from "@/schemas/function-blocks/counter.schema";
import { createTimerBlockVariables, getTimerBlockParams } from "@/schemas/function-blocks/timer.schema";
import { validateBlockName } from "@/schemas/function-blocks/function-block.schema";
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
			...this.buildCounterExposedVariables(ladder),
		];
	}

	/**
	 * `allVariables` : l'ensemble complet à résoudre — `project.variables` plus les variables
	 * générées par TOUS les programmes du projet, y compris ce ladder (voir
	 * `ProgramAnalyser.analyse`/`generateVariables`).
	 */
	analyse(ladder: Ladder, project: Project, allVariables: Variable[]): LadderAnalysisResult {
		const variablesByMnemonic = new Map(allVariables.map((v) => [v.mnemonic, v]));

		const issues: ProjectAnalyserIssue[] = [...this.checkConnectionColumnOrder(ladder)];
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
	 * Défense en profondeur : la cible d'une connexion doit rester à une colonne au moins égale à
	 * celle de sa source, garanti par `ConnectionsAddCommand`/`isConnectionAllowed` à la création
	 * d'une connexion et par `LadderWorkflowManager.isPositionValidForConnections` quand un élément
	 * connecté est ensuite déplacé — mais jamais revérifié pour un projet importé/édité à la main.
	 * `computeNetworkAssignments` du pré-compilateur trie les éléments par colonne croissante et
	 * suppose la source déjà traitée avant sa cible.
	 */
	private checkConnectionColumnOrder(ladder: Ladder): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		for (const section of ladder.sections) {
			for (const connection of section.connections) {
				const source = section.getElement(connection.source.id);
				const target = section.getElement(connection.target.id);
				if (!source || !target) continue;
				if (target.position.col < source.position.col) {
					issues.push(
						new ProjectAnalyserIssue(
							"error",
							"LADDER_CONNECTION_INVALID_ORDER",
							{ sourceType: "ladder-network", sourceId: section.id, parentId: ladder.id },
							"Une connexion relie un élément à un autre situé dans une colonne antérieure.",
						),
					);
				}
			}
		}
		return issues;
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
	 * Un nom de bloc tempo/compteur partage son espace de noms avec les mnémoniques de variable
	 * (voir `Project.isNameTaken`) — cette vérification côté UI n'empêche pas une collision dans un
	 * projet importé/édité à la main. Deux blocs de même nom généreraient des variables au même
	 * mnémonique (`<Nom>.IN`...), l'une écrasant l'autre silencieusement dans
	 * `variablesByMnemonic` (voir `analyse`). Statique : porte sur l'ensemble des ladders du projet.
	 * Un nom vide est ignoré ici : déjà signalé par `BLOCK_TIMER_PT_EMPTY`/`BLOCK_COUNTER_CONTROL_EMPTY`
	 * ou l'absence de nom n'a pas de sens à comparer entre blocs.
	 */
	static checkBlockNameConflicts(project: Project): ProjectAnalyserIssue[] {
		const namedBlocks = [
			...project.getAllTimerBlockElements().map(({ ladder, element }) => ({
				ladder,
				element,
				name: getTimerBlockParams(element)?.name ?? "",
			})),
			...project.getAllCounterBlockElements().map(({ ladder, element }) => ({
				ladder,
				element,
				name: getCounterBlockParams(element)?.name ?? "",
			})),
		].filter((block) => block.name !== "");

		const projectMnemonics = new Set(project.variables.map((v) => v.mnemonic));
		const issues: ProjectAnalyserIssue[] = [];
		const namesSeen = new Set<string>();

		for (const block of namedBlocks) {
			const source = { sourceType: "ladder-block", sourceId: block.element.id, parentId: block.ladder.id } as const;
			if (projectMnemonics.has(block.name)) {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"BLOCK_NAME_VARIABLE_CONFLICT",
						source,
						`Le nom "${block.name}" de ce bloc entre en conflit avec une variable existante du même nom.`,
					),
				);
			} else if (namesSeen.has(block.name)) {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"BLOCK_NAME_DUPLICATE",
						source,
						`Le nom "${block.name}" de ce bloc est déjà utilisé par un autre bloc du projet.`,
					),
				);
			}
			namesSeen.add(block.name);
		}
		return issues;
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
	 * `BLOCK_PORT_LABELS[blockType]`. Un bloc `"timer"`/`"counter"` en est exclu : ses ports
	 * structurels sont déjà de vraies `Variable` générées à partir de sa config
	 * (`buildTimerExposedVariables`/`buildCounterExposedVariables`), pas des variables cachées
	 * propres à ce mécanisme.
	 */
	private buildBlockPortVariables(ladder: Ladder): Variable[] {
		const variables: Variable[] = [];
		for (const element of ladder.getAllElements()) {
			if (element.type !== "block" || element.data.blockType === "timer" || element.data.blockType === "counter")
				continue;
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
	 * partir de la config embarquée dans l'élément, elles disparaissent avec lui. Un nom de bloc
	 * invalide est ignoré ici (le constructeur `Variable` lèverait sinon) : `TimerBlockAnalyser`
	 * signale l'erreur à l'utilisateur, cette méthode tourne avant toute analyse et ne doit jamais
	 * lever.
	 */
	private buildTimerExposedVariables(ladder: Ladder): Variable[] {
		const variables: Variable[] = [];
		for (const element of ladder.getAllElements()) {
			if (element.type !== "block" || element.data.blockType !== "timer") continue;
			if (validateBlockName(element.data.params.name).length > 0) continue;
			variables.push(...createTimerBlockVariables(element.id, element.data.params.name));
		}
		return variables;
	}

	/**
	 * Les variables pulsion/Q/CV exposées d'un bloc compteur — voir `createCounterBlockVariables`.
	 * Jamais persistées dans `project.variables` : générées ici à partir de la config embarquée
	 * dans l'élément, elles disparaissent avec lui. Contrairement au timer, aucune variable
	 * mémoire cachée de détection de front n'est nécessaire (`input`/`control` évalués en
	 * niveau, voir `CounterNodeEvaluator`).
	 */
	private buildCounterExposedVariables(ladder: Ladder): Variable[] {
		const variables: Variable[] = [];
		for (const element of ladder.getAllElements()) {
			if (element.type !== "block" || element.data.blockType !== "counter") continue;
			if (validateBlockName(element.data.params.name).length > 0) continue;
			variables.push(
				...createCounterBlockVariables(element.id, element.data.params.name, element.data.params.counterType),
			);
		}
		return variables;
	}
}
