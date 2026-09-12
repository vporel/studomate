import Grafcet from "../grafcet.schema";
import Junction, { JUNCTION_HANDLE_PIVOT } from "../junction.schema";

/**
 * A helper that generalizes functions related to both 'and' and 'or' junctions'
 */
export default class JunctionHelper {
	/**
	 * Checks if the junction pivot is connected to an element
	 */
	static isPivotConnected(junctionId: string, grafcet: Grafcet): boolean {
		const connections = grafcet.getConnectionsByElementIdAndHandle(
			junctionId,
			JUNCTION_HANDLE_PIVOT,
		);
		return connections.length > 0;
	}

	/**
	 * Checks if each branch of the junction has exactly one connection — a total-count
	 * comparison would miss two connections stacked on the same branch while another branch
	 * stays empty, and would still count a stale connection left on a since-removed branch.
	 */
	static areAllBranchesConnected(
		junctionId: string,
		grafcet: Grafcet,
	): boolean {
		const junction = grafcet.getElementById<Junction>(junctionId);
		if (!junction) return false;

		return junction.data.branchesOrder.every(
			(branchId) =>
				grafcet.getConnectionsByElementIdAndHandle(junctionId, branchId)
					.length === 1,
		);
	}
}
