import JunctionHelper from "@/schemas/grafcet/helpers/junction.helper";
import JunctionOrStart from "@/schemas/grafcet/junction-or-start.schema";
import Variable from "@/schemas/variable/variable.schema";
import Grafcet from "../../../schemas/grafcet/grafcet.schema";
import ProjectAnalyserIssue from "../../project.analyser.issue";
import ElementAnalyser, { ElementAnalyseIsolatedOptions } from "./element.analyser";

export default class JunctionOrStartAnalyser extends ElementAnalyser<JunctionOrStart> {
	/**
	 * Rules that apply to the step's own data, independently of the grafcet.
	 */
	analyseIsolated(
		_junctionOrStart: JunctionOrStart,
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
		junctionOrStart: JunctionOrStart,
		grafcet: Grafcet,
		_variables: Variable[],
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = { sourceType: "grafcet-junction-or-start" as const, sourceId: junctionOrStart.id };

		if (!JunctionHelper.isPivotConnected(junctionOrStart.id, grafcet)) {
			issues.push(
				new ProjectAnalyserIssue("error", source, "Le pivot n'est connecté à aucun élément."),
			);
		}

		if (!JunctionHelper.areAllBranchesConnected(junctionOrStart.id, grafcet)) {
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
