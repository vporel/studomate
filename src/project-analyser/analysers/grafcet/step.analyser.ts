import Variable from "@/schemas/variable/variable.schema";
import Grafcet from "../../../schemas/grafcet/grafcet.schema";
import Step from "../../../schemas/grafcet/step.schema";
import ProjectAnalyserIssue from "../../project.analyser.issue";
import ElementAnalyser, { ElementAnalyseIsolatedOptions } from "./element.analyser";

export default class StepAnalyser extends ElementAnalyser<Step> {
	/**
	 * Rules that apply to the step's own data, independently of the grafcet.
	 */
	analyseIsolated(
		step: Step,
		{ allowEmptyContent = false }: ElementAnalyseIsolatedOptions = {},
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = { sourceType: "grafcet-step" as const, sourceId: step.id };

		if (step.data.number === "" || step.data.number === null || step.data.number === undefined) {
			if (!allowEmptyContent) {
				issues.push(
					new ProjectAnalyserIssue("error", source, "Le numéro de l'étape n'est pas défini."),
				);
			}
			return issues;
		}
		if (!Number.isInteger(step.data.number) || step.data.number < 0) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					source,
					"Le numéro de l'étape doit être un entier positif.",
				),
			);
		}

		return issues;
	}

	/**
	 * Rules that require knowledge of the full grafcet.
	 */
	analyseInContext(step: Step, grafcet: Grafcet, variables: Variable[]): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = { sourceType: "grafcet-step" as const, sourceId: step.id };

		// Step number must be unique within the grafcet
		const sameNumber = grafcet.steps.filter(
			(s) => s.id !== step.id && s.data.number !== "" && s.data.number === step.data.number,
		);
		if (sameNumber.length > 0) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					source,
					`Le numéro d'étape ${step.data.number} est utilisé par plusieurs étapes.`,
				),
			);
		}

		return issues;
	}
}
