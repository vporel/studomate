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
		}

		return issues;
	}
}
