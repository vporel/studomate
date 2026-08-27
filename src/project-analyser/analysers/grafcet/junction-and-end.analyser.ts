import JunctionHelper from "@/schemas/grafcet/helpers/junction.helper";
import JunctionAndEnd from "@/schemas/grafcet/junction-and-end.schema";
import { Environment } from "@/simulator/interpreter/environment/environment";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
import GrafcetElementAnalyser, {
	ElementAnalyseIsolatedOptions,
} from "./element.analyser";

export default class JunctionAndEndAnalyser extends GrafcetElementAnalyser<JunctionAndEnd> {
	/**
	 * Rules that apply to the step's own data, independently of the grafcet.
	 */
	analyseIsolated(
		_junctionAndEnd: JunctionAndEnd,
		_options: ElementAnalyseIsolatedOptions = {},
	): ProjectAnalyserIssue[] {
		//Aucune règle isolée : la validité d'une jonction dépend entièrement de ses
		//connexions, donc de son contexte (voir analyseInContext).
		return [];
	}

	/**
	 * Rules that require knowledge of the full grafcet.
	 */
	analyseInContext(
		junctionAndEnd: JunctionAndEnd,
		grafcet: Grafcet,
		_environment: Environment,
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = {
			sourceType: "grafcet-junction-and-end" as const,
			sourceId: junctionAndEnd.id,
		};

		if (!JunctionHelper.isPivotConnected(junctionAndEnd.id, grafcet)) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"JUNCTION_PIVOT_NOT_CONNECTED",
					source,
					"Le pivot n'est connecté à aucun élément.",
				),
			);
		}

		if (!JunctionHelper.areAllBranchesConnected(junctionAndEnd.id, grafcet)) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"JUNCTION_BRANCH_NOT_CONNECTED",
					source,
					"Certaines branches ne sont connectées à aucun élément.",
				),
			);
		} else {
			// All branches are connected — check that they all originate from the same junction-and-start
			const branchIds = junctionAndEnd.data.branchesOrder;
			const jasPerBranch: (string | null)[] = [];
			for (const branchId of branchIds) {
				const conns = grafcet.getConnectionsByElementIdAndHandle(
					junctionAndEnd.id,
					branchId,
				);
				if (conns.length === 0) break; // safety guard, already covered above
				jasPerBranch.push(
					JunctionAndEndAnalyser.backwardBfsJunctionAndStartId(
						conns[0].source.id,
						grafcet,
					),
				);
			}

			if (jasPerBranch.length === branchIds.length) {
				const anyMissing = jasPerBranch.some((id) => id === null);
				const distinct = new Set(
					jasPerBranch.filter((id): id is string => id !== null),
				);
				if (anyMissing || distinct.size !== 1) {
					issues.push(
						new ProjectAnalyserIssue(
							"error",
							"JUNCTION_AND_CONVERGENCE_WITHOUT_DIVERGENCE",
							source,
							"La convergence en ET ne provient pas d'une divergence en ET.",
						),
					);
				} else {
					// All branches originate from the same junction-and-start — check branch count matches
					const jasId = [...distinct][0];
					const jas = grafcet.junctionsAndStarts[jasId]!;
					if (jas.data.branchesOrder.length !== branchIds.length) {
						issues.push(
							new ProjectAnalyserIssue(
								"error",
								"JUNCTION_AND_BRANCH_COUNT_MISMATCH",
								source,
								"Le nombre de branches de la convergence en ET ne correspond pas à celui de la divergence en ET.",
							),
						);
					}
				}
			}
		}

		return issues;
	}

	/**
	 * Backward BFS from startId through the grafcet connection graph, à la profondeur
	 * d'imbrication ET près : une JunctionAndEnd croisée en chemin ouvre un niveau, la
	 * JunctionAndStart qui la referme ne compte pas comme la fermeture recherchée.
	 * Returns the id of the junction-and-start node that opens the arriving convergence, or null.
	 */
	private static backwardBfsJunctionAndStartId(
		startId: string,
		grafcet: Grafcet,
	): string | null {
		const visited = new Set<string>();
		const queue: { id: string; depth: number }[] = [{ id: startId, depth: 0 }];
		while (queue.length > 0) {
			const { id: current, depth } = queue.shift()!;
			if (visited.has(current)) continue;
			visited.add(current);

			if (grafcet.junctionsAndStarts[current]) {
				if (depth === 0) return current;
				for (const conn of grafcet.connections) {
					if (conn.target.id === current && !visited.has(conn.source.id)) {
						queue.push({ id: conn.source.id, depth: depth - 1 });
					}
				}
				continue;
			}

			const nextDepth = grafcet.junctionsAndEnds[current] ? depth + 1 : depth;
			for (const conn of grafcet.connections) {
				if (conn.target.id === current && !visited.has(conn.source.id)) {
					queue.push({ id: conn.source.id, depth: nextDepth });
				}
			}
		}
		return null;
	}
}
