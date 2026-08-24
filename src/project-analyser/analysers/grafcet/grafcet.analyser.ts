import Project from "@/schemas/project/project.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Variable from "@/schemas/variable/variable.schema";
import ConnectionsValidator from "@/schemas/grafcet/validators/connections.validator";
import StepHelper from "@/schemas/grafcet/helpers/step.helper";
import ProgramAnalyser from "@/project-analyser/program.analyser";
import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
import ElementAnalyserFactory from "./element-analyser.factory";

export type GrafcetAnalysisResult = {
	issues: ProjectAnalyserIssue[];
	stepsVariables: Variable[];
	analysedElementsCount: number;
};

export function getStepVariableId(grafcetId: string, stepNumber: number): string {
	return `grafcet-${grafcetId}-step-${stepNumber}`;
}

export function getStepVariableMnemonic(stepNumber: number): string {
	return StepHelper.getStepVariableMnemonic(stepNumber);
}

export default class GrafcetAnalyser implements ProgramAnalyser<Grafcet> {
	/**
	 * Les variables d'étape synthétiques générées par ce grafcet (`X{n}`) — voir
	 * `ProgramAnalyser.generateVariables`. Pur, ne dépend que du grafcet : `ProjectAnalyser`
	 * l'appelle pour TOUS les programmes avant d'analyser quiconque, pour que chaque programme
	 * puisse voir ce que les autres génèrent.
	 */
	generateVariables(grafcet: Grafcet): Variable[] {
		return this.buildstepsVariables(grafcet);
	}

	/**
	 * Runs all isolated and contextual rules on every element of the grafcet.
	 *
	 * `allVariables` : l'ensemble complet à résoudre — `project.variables` plus les variables
	 * générées par TOUS les programmes du projet, y compris ce grafcet (voir
	 * `ProgramAnalyser.analyse`/`generateVariables`).
	 */
	analyse(grafcet: Grafcet, project: Project, allVariables: Variable[]): GrafcetAnalysisResult {
		// Propre à ce grafcet, indépendant de `allVariables` : sert au conflit de nom
		// (`checkStepVariableNameConflicts`) et reste exposé dans le résultat.
		const stepsVariables = this.generateVariables(grafcet);
		const elementsIssues = grafcet
			.getAllElements()
			.flatMap((element) => {
				const analyser = ElementAnalyserFactory.getAnalyserForType(element.type);
				return [
					...analyser.analyseIsolated(element, {
						allowEmptyContent: false,
						dialect: project.dialect,
					}),
					...analyser.analyseInContext(element, grafcet, allVariables, project.dialect),
				];
			})
			.map((issue) => {
				// Attach parentId
				issue.source.parentId = grafcet.id;
				return issue;
			});
		const issues = [
			...this.checkAtLeastTwoSteps(grafcet),
			...this.checkInitialStep(grafcet),
			...this.checkConnectedComponents(grafcet),
			...this.checkConnectionTypes(grafcet),
			...this.checkDirectedReachability(grafcet),
			...this.checkStepVariableNameConflicts(grafcet, project, stepsVariables),
			...elementsIssues,
		];

		return {
			issues,
			stepsVariables,
			analysedElementsCount: grafcet.getAllElements().length,
		};
	}

	/**
	 * Cross-grafcet rule: a step number must be unique across all grafcets of a project. Statique
	 * (et pas une méthode d'instance) : porte sur l'ensemble des programmes du projet, pas sur un
	 * seul grafcet — appelée une fois par `ProjectAnalyser`, pas par grafcet.
	 *
	 * Uses the already-computed generatedVariablesByProgram (one mnemonic = one valid unique
	 * number per grafcet), filtré aux seuls grafcets du projet (le même map contient aussi les
	 * variables générées par les ladders). Detection: total mnemonic count vs Set size — if they
	 * differ, duplicates exist across grafcets. Emits one project-level issue per duplicated
	 * number, listing the involved grafcet names.
	 */
	static checkDuplicateStepNumbers(
		generatedVariablesByProgram: Map<string, Variable[]>,
		project: Project,
	): ProjectAnalyserIssue[] {
		const grafcetVariablesByProgram = new Map(
			[...generatedVariablesByProgram].filter(([programId]) => project.getGrafcet(programId) !== undefined),
		);
		const allMnemonics = [...grafcetVariablesByProgram.values()].flatMap((vars) => vars.map((v) => v.mnemonic));

		// Quick exit: no cross-grafcet duplicates
		if (new Set(allMnemonics).size === allMnemonics.length) return [];

		// Build mnemonic → grafcet names mapping
		const mnemonicToGrafcetNames = new Map<string, string[]>();
		for (const [grafcetId, vars] of grafcetVariablesByProgram) {
			const grafcetName = project.getProgram(grafcetId)?.name ?? grafcetId;
			for (const variable of vars) {
				if (!mnemonicToGrafcetNames.has(variable.mnemonic)) mnemonicToGrafcetNames.set(variable.mnemonic, []);
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

	/**
	 * Generates one synthetic BOOL memory variable per step with a valid, unique number.
	 * Mnemonic: X{stepNumber} — deduplicated by mnemonic so duplicate-number errors
	 * don't produce duplicate variables.
	 */
	private buildstepsVariables(grafcet: Grafcet): Variable[] {
		const seen = new Set<number>();
		const variables: Variable[] = [];

		for (const step of grafcet.steps) {
			const n = step.data.number;
			if (n === null || n === undefined || n === "" || !Number.isInteger(n) || (n as number) < 0)
				continue;
			if (seen.has(n as number)) continue;
			seen.add(n as number);
			variables.push(
				new Variable(getStepVariableId(grafcet.id, n), getStepVariableMnemonic(n), "memory", "BOOL"),
			);
		}

		return variables;
	}

	/**
	 * Grafcet-level rule: a project variable must not share its mnemonic with a synthetic
	 * step variable X{n} — the analogous rule already exists for timer identifiers
	 * (`TRANSITION_TIMER_NAME_CONFLICT`). An unchecked collision here silently shadows one of
	 * the two variables in every expression of the grafcet.
	 */
	private checkStepVariableNameConflicts(
		grafcet: Grafcet,
		project: Project,
		stepsVariables: Variable[],
	): ProjectAnalyserIssue[] {
		const projectMnemonics = new Set(project.variables.map((v) => v.mnemonic));
		return stepsVariables
			.filter((stepVariable) => projectMnemonics.has(stepVariable.mnemonic))
			.map(
				(stepVariable) =>
					new ProjectAnalyserIssue(
						"error",
						"GRAFCET_STEP_VARIABLE_NAME_CONFLICT",
						{ sourceType: "grafcet", sourceId: grafcet.id },
						`La variable "${stepVariable.mnemonic}" entre en conflit avec la variable d'étape générée automatiquement du même nom.`,
					),
			);
	}

	private checkAtLeastTwoSteps(grafcet: Grafcet): ProjectAnalyserIssue[] {
		if (grafcet.steps.length < 2) {
			return [
				new ProjectAnalyserIssue(
					"error",
					"GRAFCET_TOO_FEW_STEPS",
					{ sourceType: "grafcet", sourceId: grafcet.id },
					"Le grafcet doit contenir au moins deux étapes.",
				),
			];
		}
		return [];
	}

	/**
	 * Grafcet-level rule: must contain exactly one initial step.
	 *
	 * La norme autorise une situation initiale composée de plusieurs étapes actives
	 * simultanément (une par branche d'un parallélisme, typiquement) — la limite à une seule
	 * étape initiale est une contrainte de cet outil, pas du GRAFCET : `GrafcetCompiler.
	 * initializeSteps` ne sait initialiser qu'une seule étape. Documentée dans le manuel
	 * utilisateur (section Grafcet › Étapes). Cette règle doit catcher les deux cas (zéro et
	 * plusieurs) à l'analyse, pour que l'erreur ne fuite jamais jusqu'à la compilation.
	 */
	private checkInitialStep(grafcet: Grafcet): ProjectAnalyserIssue[] {
		const initialStepsCount = grafcet.steps.filter((s) => s.data.initial === true).length;
		if (initialStepsCount === 0) {
			return [
				new ProjectAnalyserIssue(
					"error",
					"GRAFCET_NO_INITIAL_STEP",
					{ sourceType: "grafcet", sourceId: grafcet.id },
					"Le grafcet ne contient aucune étape initiale.",
				),
			];
		}
		if (initialStepsCount > 1) {
			return [
				new ProjectAnalyserIssue(
					"error",
					"GRAFCET_MULTIPLE_INITIAL_STEPS",
					{ sourceType: "grafcet", sourceId: grafcet.id },
					`Le grafcet contient ${initialStepsCount} étapes initiales. Studomate ne supporte pour l'instant qu'une seule étape initiale (limite de l'outil, pas une règle du GRAFCET).`,
				),
			];
		}
		return [];
	}

	/**
	 * Grafcet-level rule: the graph formed by all connections must be a single
	 * connected component. Two disconnected sub-graphs mean two independent cycles
	 * coexist inside the same grafcet, which is not allowed.
	 * Elements with no connections are ignored (already reported by element analysers).
	 */
	private checkConnectedComponents(grafcet: Grafcet): ProjectAnalyserIssue[] {
		if (grafcet.connections.length === 0) return [];

		// Build undirected adjacency map from connections
		const adjacency = new Map<string, Set<string>>();
		for (const connection of grafcet.connections) {
			const a = connection.source.id;
			const b = connection.target.id;
			if (!adjacency.has(a)) adjacency.set(a, new Set());
			if (!adjacency.has(b)) adjacency.set(b, new Set());
			adjacency.get(a)!.add(b);
			adjacency.get(b)!.add(a);
		}

		// BFS from the first node
		const allNodes = [...adjacency.keys()];
		const visited = new Set<string>();
		const queue: string[] = [allNodes[0]];
		visited.add(allNodes[0]);
		while (queue.length > 0) {
			const current = queue.shift()!;
			for (const neighbor of adjacency.get(current)!) {
				if (!visited.has(neighbor)) {
					visited.add(neighbor);
					queue.push(neighbor);
				}
			}
		}

		if (visited.size === allNodes.length) return [];

		return [
			new ProjectAnalyserIssue(
				"error",
				"GRAFCET_DISCONNECTED_COMPONENTS",
				{ sourceType: "grafcet", sourceId: grafcet.id },
				"Le grafcet contient plusieurs réseaux non connectés (plusieurs cycles distincts).",
			),
		];
	}

	/**
	 * Grafcet-level rule: every connection must link two existing elements of compatible
	 * types (alternance étape–transition, branches de jonction typées...). `ConnectionsValidator`
	 * n'est sinon appelé qu'au tracé à la souris (`GrafcetFlow.tsx`) : un grafcet importé,
	 * migré ou construit par script n'est donc jamais revalidé sans cette règle.
	 */
	private checkConnectionTypes(grafcet: Grafcet): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = { sourceType: "grafcet" as const, sourceId: grafcet.id };

		for (const connection of grafcet.connections) {
			const sourceElement = grafcet.getElementByIdAndType(connection.source.id, connection.source.type);
			const targetElement = grafcet.getElementByIdAndType(connection.target.id, connection.target.type);
			if (!sourceElement || !targetElement) {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"GRAFCET_CONNECTION_DANGLING_ELEMENT",
						source,
						`Une connexion référence un élément inexistant (${!sourceElement ? connection.source.type : connection.target.type} "${!sourceElement ? connection.source.id : connection.target.id}").`,
					),
				);
				continue;
			}
			const isValid = ConnectionsValidator.validateNewConnection(
				{
					sourceId: connection.source.id,
					targetId: connection.target.id,
					sourceHandle: connection.source.handle,
					targetHandle: connection.target.handle,
				},
				grafcet,
			);
			if (!isValid) {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"GRAFCET_CONNECTION_INVALID_TYPE",
						source,
						`Connexion invalide entre un élément de type "${connection.source.type}" et un élément de type "${connection.target.type}".`,
					),
				);
			}
		}

		return issues;
	}

	/**
	 * Grafcet-level rule: `checkConnectedComponents` only sees an *undirected* graph, so a
	 * grafcet can be "connexe" while still containing steps unreachable from the initial step,
	 * or branches with no directed path back to any cycle (permanent dead end once entered).
	 * Both need a directed traversal to detect.
	 */
	private checkDirectedReachability(grafcet: Grafcet): ProjectAnalyserIssue[] {
		if (grafcet.connections.length === 0) return [];
		const initialStepIds = grafcet.steps.filter((s) => s.data.initial === true).map((s) => s.id);
		if (initialStepIds.length === 0) return []; // Already reported by checkInitialStep

		const forward = new Map<string, Set<string>>();
		for (const connection of grafcet.connections) {
			if (!forward.has(connection.source.id)) forward.set(connection.source.id, new Set());
			forward.get(connection.source.id)!.add(connection.target.id);
		}

		const reachableFromInitial = this.bfs(initialStepIds, forward);

		const issues: ProjectAnalyserIssue[] = [];
		const source = { sourceType: "grafcet" as const, sourceId: grafcet.id };

		const unreachableSteps = grafcet.steps.filter(
			(s) => !reachableFromInitial.has(s.id) && grafcet.getConnectionsByElementId(s.id).length > 0,
		);
		if (unreachableSteps.length > 0) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"GRAFCET_UNREACHABLE_STEPS",
					source,
					`Étape(s) inaccessible(s) depuis l'étape initiale : ${unreachableSteps.map((s) => s.data.number).join(", ")}. Cette portion du grafcet ne s'activera jamais.`,
				),
			);
		}

		// A node is "on a cycle" if it can reach itself by following at least one edge.
		const isOnCycle = (nodeId: string): boolean => {
			const visited = new Set<string>();
			const queue = [...(forward.get(nodeId) ?? [])];
			while (queue.length > 0) {
				const current = queue.shift()!;
				if (current === nodeId) return true;
				if (visited.has(current)) continue;
				visited.add(current);
				for (const next of forward.get(current) ?? []) queue.push(next);
			}
			return false;
		};
		const cyclicNodeIds = [...reachableFromInitial].filter(isOnCycle);

		if (cyclicNodeIds.length > 0) {
			const backward = new Map<string, Set<string>>();
			for (const connection of grafcet.connections) {
				if (!backward.has(connection.target.id)) backward.set(connection.target.id, new Set());
				backward.get(connection.target.id)!.add(connection.source.id);
			}
			const canReachCycle = this.bfs(cyclicNodeIds, backward);

			const deadEndSteps = grafcet.steps.filter(
				(s) => reachableFromInitial.has(s.id) && !canReachCycle.has(s.id),
			);
			if (deadEndSteps.length > 0) {
				issues.push(
					new ProjectAnalyserIssue(
						"warning",
						"GRAFCET_DEAD_END_STEPS",
						source,
						`Étape(s) sans chemin de retour vers un cycle : ${deadEndSteps.map((s) => s.data.number).join(", ")}. Une fois atteinte(s), le grafcet s'y bloque définitivement.`,
					),
				);
			}
		}

		return issues;
	}

	/**
	 * Breadth-first traversal of a directed adjacency map, starting from the given node ids.
	 * Returns the set of visited nodes (including the start ids).
	 */
	private bfs(startIds: string[], adjacency: Map<string, Set<string>>): Set<string> {
		const visited = new Set<string>(startIds);
		const queue = [...startIds];
		while (queue.length > 0) {
			const current = queue.shift()!;
			for (const next of adjacency.get(current) ?? []) {
				if (!visited.has(next)) {
					visited.add(next);
					queue.push(next);
				}
			}
		}
		return visited;
	}
}
