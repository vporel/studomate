import JunctionHelper from "@/schemas/grafcet/helpers/junction.helper";
import JunctionAndEnd from "@/schemas/grafcet/junction-and-end.schema";
import Variable from "@/schemas/variable/variable.schema";
import Grafcet from "../../../schemas/grafcet/grafcet.schema";
import ProjectAnalyserIssue from "../../project.analyser.issue";
import ElementAnalyser, { ElementAnalyseIsolatedOptions } from "./element.analyser";

export default class JunctionAndEndAnalyser extends ElementAnalyser<JunctionAndEnd> {
	/**
	 * Rules that apply to the step's own data, independently of the grafcet.
	 */
	analyseIsolated(
		junctionAndEnd: JunctionAndEnd,
		options: ElementAnalyseIsolatedOptions = {},
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = { sourceType: "grafcet-junction-and-end" as const, sourceId: junctionAndEnd.id };

		return issues;
	}

	/**
	 * Rules that require knowledge of the full grafcet.
	 */
	analyseInContext(
		junctionAndEnd: JunctionAndEnd,
		grafcet: Grafcet,
		variables: Variable[],
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = { sourceType: "grafcet-junction-and-end" as const, sourceId: junctionAndEnd.id };

		if (!JunctionHelper.isPivotConnected(junctionAndEnd.id, grafcet)) {
			issues.push(
				new ProjectAnalyserIssue("error", source, "Le pivot n'est connecté à aucun élément."),
			);
		}

		if (!JunctionHelper.areAllBranchesConnected(junctionAndEnd.id, grafcet)) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					source,
					"Certaines branches ne sont connectées à aucun élément.",
				),
			);
		} else {
			// All branches are connected — check that they all originate from the same junction-and-start
			const branchIds = junctionAndEnd.data.branchesOrder;
			const jasPerBranch: (string | null)[] = [];
			for (const branchId of branchIds) {
				const conns = grafcet.getConnectionsByElementIdAndHandle(junctionAndEnd.id, branchId);
				if (conns.length === 0) break; // safety guard, already covered above
				jasPerBranch.push(
					JunctionAndEndAnalyser.backwardBfsJunctionAndStartId(conns[0].source.id, grafcet),
				);
			}

			if (jasPerBranch.length === branchIds.length) {
				const anyMissing = jasPerBranch.some((id) => id === null);
				const distinct = new Set(jasPerBranch.filter((id): id is string => id !== null));
				if (anyMissing || distinct.size !== 1) {
					issues.push(
						new ProjectAnalyserIssue(
							"error",
							source,
							"La convergence en ET ne provient pas d'une divergence en ET.",
						),
					);
				} else {
					// All branches originate from the same junction-and-start — check branch count matches
					const jasId = [...distinct][0];
					const jas = grafcet.junctionsAndStarts.find((j) => j.id === jasId)!;
					if (jas.data.branchesOrder.length !== branchIds.length) {
						issues.push(
							new ProjectAnalyserIssue(
								"error",
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
	 * Backward BFS from startId through the grafcet connection graph.
	 * Returns the id of the first junction-and-start node reachable, or null.
	 */
	private static backwardBfsJunctionAndStartId(startId: string, grafcet: Grafcet): string | null {
		const visited = new Set<string>();
		const queue: string[] = [startId];
		while (queue.length > 0) {
			const current = queue.shift()!;
			if (visited.has(current)) continue;
			visited.add(current);
			if (grafcet.junctionsAndStarts.some((j) => j.id === current)) return current;
			for (const conn of grafcet.connections) {
				if (conn.target.id === current && !visited.has(conn.source.id)) {
					queue.push(conn.source.id);
				}
			}
		}
		return null;
	}
}
