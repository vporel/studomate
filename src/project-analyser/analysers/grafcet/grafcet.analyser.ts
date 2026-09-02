import Project from "@/schemas/project/project.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Variable from "@/schemas/variable/variable.schema";
import ConnectionsValidator from "@/schemas/grafcet/validators/connections.validator";
import Connection from "@/schemas/grafcet/connection.schema";
import Element, { ElementType } from "@/schemas/grafcet/element.schema";
import StepHelper from "@/schemas/grafcet/helpers/step.helper";
import ProgramAnalyser from "@/project-analyser/program.analyser";
import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
import { TimerStringDeclarationNode } from "@/expression-language/ast/nodes/blocks";
import FinderVisitor from "@/expression-language/ast/visitors/finder.visitor";
import { Dialect } from "@/expression-language/dialect.enum";
import { parseExpressionCached } from "@/expression-language/parse-expression-cached";
import { Environment } from "@/simulator/interpreter/environment/environment";
import SchemaVariablesMapper from "@/bridge/variables.mapper";
import GrafcetElementAnalyserFactory from "./element-analyser.factory";

export type GrafcetAnalysisResult = {
	issues: ProjectAnalyserIssue[];
	stepsVariables: Variable[];
	analysedElementsCount: number;
};

export function getStepVariableId(
	grafcetId: string,
	stepNumber: number,
): string {
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
	analyse(
		grafcet: Grafcet,
		project: Project,
		allVariables: Variable[],
	): GrafcetAnalysisResult {
		// Propre à ce grafcet, indépendant de `allVariables` : sert au conflit de nom
		// (`checkStepVariableNameConflicts`) et reste exposé dans le résultat.
		const stepsVariables = this.generateVariables(grafcet);
		// Construit une seule fois pour tout le grafcet : `analyseInContext` reçoit l'`Environment`
		// et non la liste, pour qu'il soit structurellement impossible de le reconstruire par élément.
		const environment = new Environment(
			allVariables.map(SchemaVariablesMapper.schemaToEnv),
		);
		const elementsIssues = grafcet
			.getAllElements()
			.flatMap((element) => {
				const analyser = GrafcetElementAnalyserFactory.getAnalyser(
					element.type,
				);
				if (!analyser) return [];
				return [
					...analyser.analyseIsolated(element, {
						allowEmptyContent: false,
						dialect: project.dialect,
					}),
					...analyser.analyseInContext(
						element,
						grafcet,
						environment,
						project.dialect,
					),
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
			...this.checkStepVariableNameConflicts(
				grafcet,
				project,
				stepsVariables,
				allVariables,
			),
			...this.checkDuplicateTimerNames(grafcet, project.dialect),
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
			[...generatedVariablesByProgram].filter(
				([programId]) => project.getGrafcet(programId) !== undefined,
			),
		);
		const allMnemonics = [...grafcetVariablesByProgram.values()].flatMap(
			(vars) => vars.map((v) => v.mnemonic),
		);

		// Quick exit: no cross-grafcet duplicates
		if (new Set(allMnemonics).size === allMnemonics.length) return [];

		// Build mnemonic → grafcet names mapping
		const mnemonicToGrafcetNames = new Map<string, string[]>();
		for (const [grafcetId, vars] of grafcetVariablesByProgram) {
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
					{ stepNumber, grafcetNames: names },
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

		for (const step of Object.values(grafcet.steps)) {
			const n = step.data.number;
			if (
				n === null ||
				n === undefined ||
				n === "" ||
				!Number.isInteger(n) ||
				(n as number) < 0
			)
				continue;
			if (seen.has(n as number)) continue;
			seen.add(n as number);
			variables.push(
				new Variable(
					getStepVariableId(grafcet.id, n),
					getStepVariableMnemonic(n),
					"memory",
					"BOOL",
				),
			);
		}

		return variables;
	}

	/**
	 * Grafcet-level rule: a variable must not share its mnemonic with a synthetic step
	 * variable X{n} — the analogous rule already exists for timer identifiers
	 * (`TRANSITION_TIMER_NAME_CONFLICT`). An unchecked collision here silently shadows one of
	 * the two variables in every expression of the grafcet.
	 *
	 * Compare contre `allVariables` (variables projet + celles générées par tous les
	 * programmes) privé des variables d'étape synthétiques de tous les grafcets : le conflit
	 * `X{n}` vs `X{n}` entre grafcets est déjà couvert par `checkDuplicateStepNumbers`.
	 */
	private checkStepVariableNameConflicts(
		grafcet: Grafcet,
		project: Project,
		stepsVariables: Variable[],
		allVariables: Variable[],
	): ProjectAnalyserIssue[] {
		const grafcetsById = new Map(Object.entries(project.grafcets));
		grafcetsById.set(grafcet.id, grafcet);
		const stepVariableIds = new Set(
			[...grafcetsById.values()].flatMap((g) =>
				this.generateVariables(g).map((v) => v.id),
			),
		);
		const externalMnemonics = new Set(
			allVariables
				.filter((v) => !stepVariableIds.has(v.id))
				.map((v) => v.mnemonic),
		);
		return stepsVariables
			.filter((stepVariable) => externalMnemonics.has(stepVariable.mnemonic))
			.map(
				(stepVariable) =>
					new ProjectAnalyserIssue(
						"error",
						"GRAFCET_STEP_VARIABLE_NAME_CONFLICT",
						{ sourceType: "grafcet", sourceId: grafcet.id },
						{ variableName: stepVariable.mnemonic },
					),
			);
	}

	private checkAtLeastTwoSteps(grafcet: Grafcet): ProjectAnalyserIssue[] {
		if (Object.keys(grafcet.steps).length < 2) {
			return [
				new ProjectAnalyserIssue("error", "GRAFCET_TOO_FEW_STEPS", {
					sourceType: "grafcet",
					sourceId: grafcet.id,
				}),
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
		const initialStepsCount = Object.values(grafcet.steps).filter(
			(s) => s.data.initial === true,
		).length;
		if (initialStepsCount === 0) {
			return [
				new ProjectAnalyserIssue("error", "GRAFCET_NO_INITIAL_STEP", {
					sourceType: "grafcet",
					sourceId: grafcet.id,
				}),
			];
		}
		if (initialStepsCount > 1) {
			return [
				new ProjectAnalyserIssue(
					"error",
					"GRAFCET_MULTIPLE_INITIAL_STEPS",
					{ sourceType: "grafcet", sourceId: grafcet.id },
					{ count: initialStepsCount },
				),
			];
		}
		return [];
	}

	/**
	 * Règle grafcet : l'identifiant d'une temporisation courte (`t1` dans `t1/X1/5s`) doit être
	 * unique au sein du grafcet. Il n'a aucune portée propre — le pré-compilateur génère un
	 * accumulateur distinct par occurrence (voir `TransitionPreCompiler`) — mais deux
	 * temporisations qui partagent un identifiant trahissent presque toujours une faute de
	 * saisie. La règle s'arrête au grafcet : le même identifiant peut resservir dans un autre
	 * grafcet du projet.
	 */
	private checkDuplicateTimerNames(
		grafcet: Grafcet,
		dialect: Dialect,
	): ProjectAnalyserIssue[] {
		const nameCounts = new Map<string, number>();
		for (const transition of Object.values(grafcet.transitions)) {
			const expression = transition.getFullExpression().trim();
			if (expression === "") continue;
			let declarations: TimerStringDeclarationNode[];
			try {
				const { ast: node } = parseExpressionCached(expression, dialect);
				declarations = new FinderVisitor<TimerStringDeclarationNode>(
					"TIMER_STRING_DECLARATION",
				).visit(node);
			} catch {
				// Expression invalide : déjà signalée par `TransitionAnalyser`, on l'ignore ici.
				continue;
			}
			for (const declaration of declarations) {
				nameCounts.set(
					declaration.name,
					(nameCounts.get(declaration.name) ?? 0) + 1,
				);
			}
		}

		return [...nameCounts]
			.filter(([, count]) => count > 1)
			.map(
				([name]) =>
					new ProjectAnalyserIssue(
						"error",
						"GRAFCET_DUPLICATE_TIMER_NAME",
						{ sourceType: "grafcet", sourceId: grafcet.id },
						{ timerName: name },
					),
			);
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
			new ProjectAnalyserIssue("error", "GRAFCET_DISCONNECTED_COMPONENTS", {
				sourceType: "grafcet",
				sourceId: grafcet.id,
			}),
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

		// Index construits une fois : sans eux, chaque connexion refait des `.find`/`.filter`
		// linéaires (ici et dans `ConnectionsValidator`), soit O(connexions²).
		const elementById = new Map<string, Element<any>>();
		for (const element of grafcet.getAllElements())
			elementById.set(element.id, element);
		const elementTypeById = new Map<string, ElementType>();
		const connectionsByElementId = new Map<string, Connection[]>();
		for (const [id, element] of elementById)
			elementTypeById.set(id, element.type as ElementType);
		for (const connection of grafcet.connections) {
			for (const endId of new Set([
				connection.source.id,
				connection.target.id,
			])) {
				const list = connectionsByElementId.get(endId);
				if (list) list.push(connection);
				else connectionsByElementId.set(endId, [connection]);
			}
		}
		const validationIndex = { elementTypeById, connectionsByElementId };

		for (const connection of grafcet.connections) {
			const sourceCandidate = elementById.get(connection.source.id);
			const targetCandidate = elementById.get(connection.target.id);
			const sourceElement =
				sourceCandidate?.type === connection.source.type
					? sourceCandidate
					: undefined;
			const targetElement =
				targetCandidate?.type === connection.target.type
					? targetCandidate
					: undefined;
			if (!sourceElement || !targetElement) {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"GRAFCET_CONNECTION_DANGLING_ELEMENT",
						source,
						{
							elementType: !sourceElement
								? connection.source.type
								: connection.target.type,
							elementId: !sourceElement
								? connection.source.id
								: connection.target.id,
						},
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
				validationIndex,
			);
			if (!isValid) {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"GRAFCET_CONNECTION_INVALID_TYPE",
						source,
						{
							sourceType: connection.source.type,
							targetType: connection.target.type,
						},
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
		const initialStepIds = Object.values(grafcet.steps)
			.filter((s) => s.data.initial === true)
			.map((s) => s.id);
		if (initialStepIds.length === 0) return []; // Already reported by checkInitialStep

		const forward = new Map<string, Set<string>>();
		for (const connection of grafcet.connections) {
			if (!forward.has(connection.source.id))
				forward.set(connection.source.id, new Set());
			forward.get(connection.source.id)!.add(connection.target.id);
		}

		const reachableFromInitial = this.bfs(initialStepIds, forward);

		const issues: ProjectAnalyserIssue[] = [];
		const source = { sourceType: "grafcet" as const, sourceId: grafcet.id };

		const unreachableSteps = Object.values(grafcet.steps).filter(
			(s) =>
				!reachableFromInitial.has(s.id) &&
				grafcet.getConnectionsByElementId(s.id).length > 0,
		);
		if (unreachableSteps.length > 0) {
			issues.push(
				new ProjectAnalyserIssue("error", "GRAFCET_UNREACHABLE_STEPS", source, {
					stepNumbers: unreachableSteps
						.map((s) => s.data.number)
						.join(", "),
				}),
			);
		}

		const cyclicNodes = this.computeCyclicNodeIds(forward);
		const cyclicNodeIds = [...reachableFromInitial].filter((id) =>
			cyclicNodes.has(id),
		);

		if (cyclicNodeIds.length > 0) {
			const backward = new Map<string, Set<string>>();
			for (const connection of grafcet.connections) {
				if (!backward.has(connection.target.id))
					backward.set(connection.target.id, new Set());
				backward.get(connection.target.id)!.add(connection.source.id);
			}
			const canReachCycle = this.bfs(cyclicNodeIds, backward);

			const deadEndSteps = Object.values(grafcet.steps).filter(
				(s) => reachableFromInitial.has(s.id) && !canReachCycle.has(s.id),
			);
			if (deadEndSteps.length > 0) {
				issues.push(
					new ProjectAnalyserIssue(
						"warning",
						"GRAFCET_DEAD_END_STEPS",
						source,
						{
							stepNumbers: deadEndSteps
								.map((s) => s.data.number)
								.join(", "),
						},
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
	private bfs(
		startIds: string[],
		adjacency: Map<string, Set<string>>,
	): Set<string> {
		const visited = new Set<string>(startIds);
		const queue = [...startIds];
		// Index de tête plutôt que `queue.shift()` (O(n)) : la file reste O(1) par élément.
		for (let head = 0; head < queue.length; head++) {
			for (const next of adjacency.get(queue[head]) ?? []) {
				if (!visited.has(next)) {
					visited.add(next);
					queue.push(next);
				}
			}
		}
		return visited;
	}

	/**
	 * Ids de tous les nœuds appartenant à un cycle du graphe orienté `forward`, en une seule
	 * passe (Tarjan) : un nœud est sur un cycle si sa composante fortement connexe compte au
	 * moins deux nœuds, ou s'il porte une arête vers lui-même.
	 */
	private computeCyclicNodeIds(forward: Map<string, Set<string>>): Set<string> {
		const nodes = new Set<string>();
		for (const [from, tos] of forward) {
			nodes.add(from);
			for (const to of tos) nodes.add(to);
		}

		let nextIndex = 0;
		const index = new Map<string, number>();
		const lowlink = new Map<string, number>();
		const onStack = new Set<string>();
		const stack: string[] = [];
		const cyclic = new Set<string>();

		const strongConnect = (v: string): void => {
			index.set(v, nextIndex);
			lowlink.set(v, nextIndex);
			nextIndex++;
			stack.push(v);
			onStack.add(v);

			for (const w of forward.get(v) ?? []) {
				if (w === v) cyclic.add(v);
				if (!index.has(w)) {
					strongConnect(w);
					lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(w)!));
				} else if (onStack.has(w)) {
					lowlink.set(v, Math.min(lowlink.get(v)!, index.get(w)!));
				}
			}

			if (lowlink.get(v) === index.get(v)) {
				const component: string[] = [];
				let w: string;
				do {
					w = stack.pop()!;
					onStack.delete(w);
					component.push(w);
				} while (w !== v);
				if (component.length > 1) for (const id of component) cyclic.add(id);
			}
		};

		for (const node of nodes) {
			if (!index.has(node)) strongConnect(node);
		}

		return cyclic;
	}
}
