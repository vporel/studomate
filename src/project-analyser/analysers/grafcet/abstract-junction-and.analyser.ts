import JunctionHelper from "@/schemas/grafcet/helpers/junction.helper";
import JunctionAnd from "@/schemas/grafcet/junction.schema";
import { Environment } from "@/simulator/interpreter/environment/environment";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
import GrafcetElementAnalyser, {
	ElementAnalyseIsolatedOptions,
} from "./element.analyser";

type AndJunctionsCollection = "junctionsAndStarts" | "junctionsAndEnds";

export type AndJunctionAnalyserConfig = {
	sourceType: "grafcet-junction-and-start" | "grafcet-junction-and-end";
	/** Divergence walks forward through connections, convergence walks backward. */
	direction: "forward" | "backward";
	/** Collection holding the junctions of the same kind as the analysed one (opens a nesting level). */
	sameKindCollection: AndJunctionsCollection;
	/** Collection holding the junctions that close the analysed one. */
	oppositeCollection: AndJunctionsCollection;
	unmatchedCode:
		| "JUNCTION_AND_DIVERGENCE_NOT_CLOSED"
		| "JUNCTION_AND_CONVERGENCE_WITHOUT_DIVERGENCE";
};

export default abstract class AbstractJunctionAndAnalyser<
	T extends JunctionAnd,
> extends GrafcetElementAnalyser<T> {
	protected abstract readonly config: AndJunctionAnalyserConfig;

	/**
	 * Rules that apply to the element's own data, independently of the grafcet.
	 */
	analyseIsolated(
		_junction: T,
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
		junction: T,
		grafcet: Grafcet,
		_environment: Environment,
	): ProjectAnalyserIssue[] {
		const { sourceType, direction, oppositeCollection, unmatchedCode } =
			this.config;
		const issues: ProjectAnalyserIssue[] = [];
		const source = { sourceType, sourceId: junction.id };

		if (!JunctionHelper.isPivotConnected(junction.id, grafcet)) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"JUNCTION_PIVOT_NOT_CONNECTED",
					source,
				),
			);
		}

		if (!JunctionHelper.areAllBranchesConnected(junction.id, grafcet)) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"JUNCTION_BRANCH_NOT_CONNECTED",
					source,
				),
			);
			return issues;
		}

		// All branches are connected: check that they all reach the same matching junction
		const branchIds = junction.data.branchesOrder;
		const matchingPerBranch: (string | null)[] = [];
		for (const branchId of branchIds) {
			const conns = grafcet.getConnectionsByElementIdAndHandle(
				junction.id,
				branchId,
			);
			if (conns.length === 0) break; // safety guard, already covered above
			const neighbourId =
				direction === "forward" ? conns[0].target.id : conns[0].source.id;
			matchingPerBranch.push(
				this.bfsToMatchingJunctionId(neighbourId, grafcet),
			);
		}

		if (matchingPerBranch.length !== branchIds.length) return issues;

		const distinct = new Set(
			matchingPerBranch.filter((id): id is string => id !== null),
		);
		if (matchingPerBranch.includes(null) || distinct.size !== 1) {
			issues.push(new ProjectAnalyserIssue("error", unmatchedCode, source));
			return issues;
		}

		const matching = grafcet[oppositeCollection][[...distinct][0]]!;
		if (matching.data.branchesOrder.length !== branchIds.length) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"JUNCTION_AND_BRANCH_COUNT_MISMATCH",
					source,
				),
			);
		}
		return issues;
	}

	/**
	 * BFS from startId through the grafcet connection graph (following connections in the
	 * configured direction), à la profondeur d'imbrication ET près : a junction of the same
	 * kind met on the way opens a level, and the opposite junction that closes it doesn't count
	 * as the sought one.
	 * Returns the id of the opposite junction that matches the starting one, or null.
	 */
	private bfsToMatchingJunctionId(
		startId: string,
		grafcet: Grafcet,
	): string | null {
		const { direction, sameKindCollection, oppositeCollection } = this.config;
		const nextIds = (id: string) =>
			grafcet.connections.flatMap((conn) =>
				direction === "forward"
					? conn.source.id === id
						? [conn.target.id]
						: []
					: conn.target.id === id
						? [conn.source.id]
						: [],
			);

		const visited = new Set<string>();
		const queue: { id: string; depth: number }[] = [{ id: startId, depth: 0 }];
		while (queue.length > 0) {
			const { id: current, depth } = queue.shift()!;
			if (visited.has(current)) continue;
			visited.add(current);

			let nextDepth = depth;
			if (grafcet[oppositeCollection][current]) {
				if (depth === 0) return current;
				nextDepth = depth - 1;
			} else if (grafcet[sameKindCollection][current]) {
				nextDepth = depth + 1;
			}
			for (const next of nextIds(current)) {
				if (!visited.has(next)) queue.push({ id: next, depth: nextDepth });
			}
		}
		return null;
	}
}
