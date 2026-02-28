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
		}
		return issues;
	}
}
