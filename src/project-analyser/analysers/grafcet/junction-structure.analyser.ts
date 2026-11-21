import ProjectAnalyserIssue, {
	ProjectAnalyserIssueSource,
} from "@/project-analyser/project.analyser.issue";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import JunctionHelper from "@/schemas/grafcet/helpers/junction.helper";

export type JunctionStructureResult = {
	issues: ProjectAnalyserIssue[];
	/** When false, the branches cannot be walked and the caller stops its own checks. */
	allBranchesConnected: boolean;
};

/**
 * Structural checks shared by every junction: pivot connected, minimum number of branches, every
 * branch connected.
 */
export default function analyseJunctionStructure(
	junction: { id: string; data: { branchesOrder: string[] } },
	grafcet: Grafcet,
	source: ProjectAnalyserIssueSource,
	minBranchesCode: "JUNCTION_OR_MIN_BRANCHES" | "JUNCTION_AND_MIN_BRANCHES",
): JunctionStructureResult {
	const issues: ProjectAnalyserIssue[] = [];

	if (!JunctionHelper.isPivotConnected(junction.id, grafcet)) {
		issues.push(
			new ProjectAnalyserIssue("error", "JUNCTION_PIVOT_NOT_CONNECTED", source),
		);
	}

	if (!JunctionHelper.hasMinimumBranches(junction.data)) {
		issues.push(new ProjectAnalyserIssue("error", minBranchesCode, source));
	}

	const allBranchesConnected = JunctionHelper.areAllBranchesConnected(
		junction.id,
		grafcet,
	);
	if (!allBranchesConnected) {
		issues.push(
			new ProjectAnalyserIssue(
				"error",
				"JUNCTION_BRANCH_NOT_CONNECTED",
				source,
			),
		);
	}

	return { issues, allBranchesConnected };
}
