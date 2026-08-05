import Project from "@/schemas/project/project.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Variable from "@/schemas/variable/variable.schema";
import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
import ElementAnalyserFactory from "./element-analyser.factory";

export type GrafcetAnalysisResult = {
	issues: ProjectAnalyserIssue[];
	stepsVariables: Variable[];
};

export function getStepVariableId(grafcetId: string, stepNumber: number): string {
	return `grafcet-${grafcetId}-step-${stepNumber}`;
}

export function getStepVariableMnemonic(stepNumber: number): string {
	return `X${stepNumber}`;
}

export default class GrafcetAnalyser {
	/**
	 * Runs all isolated and contextual rules on every element of the grafcet.
	 */
	static analyse(grafcet: Grafcet, project: Project): GrafcetAnalysisResult {
		const stepsVariables = this.buildstepsVariables(grafcet);
		const allVariables = [...project.variables, ...stepsVariables];
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
			...elementsIssues,
		];

		return {
			issues,
			stepsVariables,
		};
	}

	/**
	 * Generates one synthetic BOOL memory variable per step with a valid, unique number.
	 * Mnemonic: X{stepNumber} — deduplicated by mnemonic so duplicate-number errors
	 * don't produce duplicate variables.
	 */
	private static buildstepsVariables(grafcet: Grafcet): Variable[] {
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

	private static checkAtLeastTwoSteps(grafcet: Grafcet): ProjectAnalyserIssue[] {
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
	 * The compiler assumes exactly one (`GrafcetCompiler.initializeSteps` throws otherwise) —
	 * this rule must catch both the zero and the multiple case at analysis time, so that error
	 * never leaks to compilation.
	 */
	private static checkInitialStep(grafcet: Grafcet): ProjectAnalyserIssue[] {
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
					`Le grafcet contient ${initialStepsCount} étapes initiales. Une seule étape initiale est autorisée.`,
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
	private static checkConnectedComponents(grafcet: Grafcet): ProjectAnalyserIssue[] {
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
}
