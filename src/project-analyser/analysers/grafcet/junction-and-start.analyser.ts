import JunctionHelper from "@/schemas/grafcet/helpers/junction.helper";
import JunctionAndStart from "@/schemas/grafcet/junction-and-start.schema";
import { Environment } from "@/simulator/interpreter/environment/environment";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
import GrafcetElementAnalyser, {
	ElementAnalyseIsolatedOptions,
} from "./element.analyser";

export default class JunctionAndStartAnalyser extends GrafcetElementAnalyser<JunctionAndStart> {
	/**
	 * Rules that apply to the step's own data, independently of the grafcet.
	 */
	analyseIsolated(
		_junctionAndStart: JunctionAndStart,
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
		junctionAndStart: JunctionAndStart,
		grafcet: Grafcet,
		_environment: Environment,
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = {
			sourceType: "grafcet-junction-and-start" as const,
			sourceId: junctionAndStart.id,
		};

		if (!JunctionHelper.isPivotConnected(junctionAndStart.id, grafcet)) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"JUNCTION_PIVOT_NOT_CONNECTED",
					source,
					"Le pivot n'est connecté à aucun élément.",
				),
			);
		}

		if (!JunctionHelper.areAllBranchesConnected(junctionAndStart.id, grafcet)) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"JUNCTION_BRANCH_NOT_CONNECTED",
					source,
					"Certaines branches ne sont connectées à aucun élément.",
				),
			);
		} else {
			// All branches are connected — check that they all converge at the same junction-and-end
			const branchIds = junctionAndStart.data.branchesOrder;
			const jaePerBranch: (string | null)[] = [];
			for (const branchId of branchIds) {
				const conns = grafcet.getConnectionsByElementIdAndHandle(
					junctionAndStart.id,
					branchId,
				);
				if (conns.length === 0) break; // safety guard, already covered above
				jaePerBranch.push(
					JunctionAndStartAnalyser.forwardBfsJunctionAndEndId(
						conns[0].target.id,
						grafcet,
					),
				);
			}

			if (jaePerBranch.length === branchIds.length) {
				const anyMissing = jaePerBranch.some((id) => id === null);
				const distinct = new Set(
					jaePerBranch.filter((id): id is string => id !== null),
				);
				if (anyMissing || distinct.size !== 1) {
					issues.push(
						new ProjectAnalyserIssue(
							"error",
							"JUNCTION_AND_DIVERGENCE_NOT_CLOSED",
							source,
							"La divergence en ET n'est pas fermée par une convergence en ET.",
						),
					);
				} else {
					// All branches reach the same junction-and-end — check branch count matches
					const jaeId = [...distinct][0];
					const jae = grafcet.junctionsAndEnds[jaeId]!;
					if (jae.data.branchesOrder.length !== branchIds.length) {
						issues.push(
							new ProjectAnalyserIssue(
								"error",
								"JUNCTION_AND_BRANCH_COUNT_MISMATCH",
								source,
								"Le nombre de branches de la divergence en ET ne correspond pas à celui de la convergence en ET.",
							),
						);
					}
				}
			}
		}

		return issues;
	}

	/**
	 * Forward BFS from startId through the grafcet connection graph, à la profondeur
	 * d'imbrication ET près : une JunctionAndStart croisée en chemin ouvre un niveau, la
	 * JunctionAndEnd qui la referme ne compte pas comme la fermeture recherchée.
	 * Returns the id of the junction-and-end node that closes the starting divergence, or null.
	 */
	private static forwardBfsJunctionAndEndId(
		startId: string,
		grafcet: Grafcet,
	): string | null {
		const visited = new Set<string>();
		const queue: { id: string; depth: number }[] = [{ id: startId, depth: 0 }];
		while (queue.length > 0) {
			const { id: current, depth } = queue.shift()!;
			if (visited.has(current)) continue;
			visited.add(current);

			if (grafcet.junctionsAndEnds[current]) {
				if (depth === 0) return current;
				for (const conn of grafcet.connections) {
					if (conn.source.id === current && !visited.has(conn.target.id)) {
						queue.push({ id: conn.target.id, depth: depth - 1 });
					}
				}
				continue;
			}

			const nextDepth = grafcet.junctionsAndStarts[current] ? depth + 1 : depth;
			for (const conn of grafcet.connections) {
				if (conn.source.id === current && !visited.has(conn.target.id)) {
					queue.push({ id: conn.target.id, depth: nextDepth });
				}
			}
		}
		return null;
	}
}
