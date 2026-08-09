import StepHelper from "@/schemas/grafcet/helpers/step.helper";
import Variable from "@/schemas/variable/variable.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Step from "@/schemas/grafcet/step.schema";
import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
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
					new ProjectAnalyserIssue(
						"error",
						"STEP_NUMBER_MISSING",
						source,
						"Le numéro de l'étape n'est pas défini.",
					),
				);
			}
			return issues;
		}
		if (!Number.isInteger(step.data.number) || step.data.number < 0) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"STEP_NUMBER_NOT_POSITIVE_INTEGER",
					source,
					"Le numéro de l'étape doit être un entier positif ou nul.",
				),
			);
		}

		return issues;
	}

	/**
	 * Rules that require knowledge of the full grafcet.
	 */
	analyseInContext(step: Step, grafcet: Grafcet, _variables: Variable[]): ProjectAnalyserIssue[] {
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
					"STEP_NUMBER_DUPLICATE",
					source,
					`Le numéro d'étape ${step.data.number} est utilisé par plusieurs étapes.`,
				),
			);
		}

		if (!StepHelper.hasPredecessor(step.id, grafcet) && step.data.initial !== true) {
			//We allow only the initial step to have no predecessor, as it can can be activated through a step referral source
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"STEP_NO_PREDECESSOR",
					source,
					"L'étape n'a aucun élément en amont.",
				),
			);
		}

		if (!StepHelper.hasSuccessor(step.id, grafcet)) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"STEP_NO_SUCCESSOR",
					source,
					"L'étape n'a aucun élément en aval.",
				),
			);
		}

		return issues;
	}
}
