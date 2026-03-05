import JunctionHelper from "@/schemas/grafcet/helpers/junction.helper";
import JunctionAndStart from "@/schemas/grafcet/junction-and-start.schema";
import Variable from "@/schemas/variable/variable.schema";
import Grafcet from "../../../schemas/grafcet/grafcet.schema";
import ProjectAnalyserIssue from "../../project.analyser.issue";
import ElementAnalyser, { ElementAnalyseIsolatedOptions } from "./element.analyser";

export default class JunctionAndStartAnalyser extends ElementAnalyser<JunctionAndStart> {
	/**
	 * Rules that apply to the step's own data, independently of the grafcet.
	 */
	analyseIsolated(
		junctionAndStart: JunctionAndStart,
		options: ElementAnalyseIsolatedOptions = {},
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = { sourceType: "grafcet-junction-and-start" as const, sourceId: junctionAndStart.id };

		return issues;
	}

	/**
	 * Rules that require knowledge of the full grafcet.
	 */
	analyseInContext(
		junctionAndStart: JunctionAndStart,
		grafcet: Grafcet,
		variables: Variable[],
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = { sourceType: "grafcet-junction-and-start" as const, sourceId: junctionAndStart.id };

		if (!JunctionHelper.isPivotConnected(junctionAndStart.id, grafcet)) {
			issues.push(
				new ProjectAnalyserIssue("error", source, "Le pivot n'est connecté à aucun élément."),
			);
		}

		if (!JunctionHelper.areAllBranchesConnected(junctionAndStart.id, grafcet)) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					source,
					"Certaines branches ne sont connectées à aucun élément.",
				),
			);
		} else {
			// All branches are connected — check that they all converge at the same junction-and-end
			const branchIds = junctionAndStart.data.branchesOrder;
			const jaePerBranch: (string | null)[] = [];
			for (const branchId of branchIds) {
				const conns = grafcet.getConnectionsByElementIdAndHandle(junctionAndStart.id, branchId);
				if (conns.length === 0) break; // safety guard, already covered above
				jaePerBranch.push(
					JunctionAndStartAnalyser.forwardBfsJunctionAndEndId(conns[0].target.id, grafcet),
				);
			}

			if (jaePerBranch.length === branchIds.length) {
				const anyMissing = jaePerBranch.some((id) => id === null);
				const distinct = new Set(jaePerBranch.filter((id): id is string => id !== null));
				if (anyMissing || distinct.size !== 1) {
					issues.push(
						new ProjectAnalyserIssue(
							"error",
							source,
							"La divergence en ET n'est pas fermée par une convergence en ET.",
						),
					);
				} else {
					// All branches reach the same junction-and-end — check branch count matches
					const jaeId = [...distinct][0];
					const jae = grafcet.junctionsAndEnds.find((j) => j.id === jaeId)!;
					if (jae.data.branchesOrder.length !== branchIds.length) {
						issues.push(
							new ProjectAnalyserIssue(
								"error",
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
	 * Forward BFS from startId through the grafcet connection graph.
	 * Returns the id of the first junction-and-end node reachable, or null.
	 */
	private static forwardBfsJunctionAndEndId(startId: string, grafcet: Grafcet): string | null {
		const visited = new Set<string>();
		const queue: string[] = [startId];
		while (queue.length > 0) {
			const current = queue.shift()!;
			if (visited.has(current)) continue;
			visited.add(current);
			if (grafcet.junctionsAndEnds.some((j) => j.id === current)) return current;
			for (const conn of grafcet.connections) {
				if (conn.source.id === current && !visited.has(conn.target.id)) {
					queue.push(conn.target.id);
				}
			}
		}
		return null;
	}
}
