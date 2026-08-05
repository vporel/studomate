import JunctionHelper from "@/schemas/grafcet/helpers/junction.helper";
import JunctionOrEnd from "@/schemas/grafcet/junction-or-end.schema";
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

		if (!JunctionHelper.areAllBranchesConnected(junctionOrEnd.id, grafcet)) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"JUNCTION_BRANCH_NOT_CONNECTED",
					source,
					"Certaines branches ne sont connectées à aucun élément.",
				),
			);
		}

		return issues;
	}
}
