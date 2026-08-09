import JunctionHelper from "@/schemas/grafcet/helpers/junction.helper";
import JunctionOrEnd, { JUNCTION_OR_END_HANDLE_BRANCH_TYPES } from "@/schemas/grafcet/junction-or-end.schema";
import Variable from "@/schemas/variable/variable.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
import ElementAnalyser, { ElementAnalyseIsolatedOptions } from "./element.analyser";

export default class JunctionOrEndAnalyser extends ElementAnalyser<JunctionOrEnd> {
	/**
	 * Rules that apply to the step's own data, independently of the grafcet.
	 */
	analyseIsolated(
		_junctionOrEnd: JunctionOrEnd,
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
		junctionOrEnd: JunctionOrEnd,
		grafcet: Grafcet,
		_variables: Variable[],
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = { sourceType: "grafcet-junction-or-end" as const, sourceId: junctionOrEnd.id };

		if (!JunctionHelper.isPivotConnected(junctionOrEnd.id, grafcet)) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"JUNCTION_PIVOT_NOT_CONNECTED",
					source,
					"Le pivot n'est connecté à aucun élément.",
				),
			);
		}

		if (junctionOrEnd.data.branchesOrder.length < 2) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"JUNCTION_OR_MIN_BRANCHES",
					source,
					"Une convergence en OU doit avoir au moins deux branches.",
				),
			);
		}

		if (!JunctionHelper.areAllBranchesConnected(junctionOrEnd.id, grafcet)) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"JUNCTION_BRANCH_NOT_CONNECTED",
					source,
					"Certaines branches ne sont connectées à aucun élément.",
				),
			);
			return issues;
		}

		for (const branchId of junctionOrEnd.data.branchesOrder) {
			const conns = grafcet.getConnectionsByElementIdAndHandle(junctionOrEnd.id, branchId);
			if (conns.length === 0) continue; // safety guard, already covered above
			if (!JUNCTION_OR_END_HANDLE_BRANCH_TYPES.includes(conns[0].source.type as "transition")) {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"JUNCTION_OR_END_BRANCH_NOT_TRANSITION",
						source,
						"Une convergence en OU doit provenir de transitions.",
					),
				);
			}
		}

		return issues;
	}
}
