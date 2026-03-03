import { HandleType } from "../connection.schema";
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
		const connections = grafcet.getConnectionsByElementIdAndHandle(junctionId, JUNCTION_HANDLE_PIVOT);
		return connections.length > 0;
	}

	/**
	 * Checks if all each branch of the junction is connected to an element
	 */
	static areAllBranchesConnected(junctionId: string, grafcet: Grafcet): boolean {
		const junction = grafcet.getElementById<Junction>(junctionId);
		if (!junction) return false;

		// For START junctions, branches are on the source side
		// For END junctions, branches are on the target side
		const handleType: HandleType = junction.type.endsWith("-start") ? "source" : "target";
		const connections = grafcet.getConnectionsByElementIdAndHandleType(junctionId, handleType);
		return connections.length === junction.data.branchesOrder.length;
	}
}
