import StepReferralSource from "@/schemas/grafcet/step-referral-source.schema";
import Variable from "@/schemas/variable/variable.schema";
import Grafcet from "../../../schemas/grafcet/grafcet.schema";
import ProjectAnalyserIssue from "../../project.analyser.issue";
import ElementAnalyser, { ElementAnalyseIsolatedOptions } from "./element.analyser";

export default class StepReferralSourceAnalyser extends ElementAnalyser<StepReferralSource> {
	/**
	 * Rules that apply to the step's own data, independently of the grafcet.
	 */
	analyseIsolated(
		stepReferral: StepReferralSource,
		{ allowEmptyContent = false }: ElementAnalyseIsolatedOptions = {},
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = { sourceType: "grafcet-step-referral-source" as const, sourceId: stepReferral.id };

		// Check that the target number is not empty
		if (
			stepReferral.data.targetStepNumber === "" ||
			stepReferral.data.targetStepNumber === null ||
			stepReferral.data.targetStepNumber === undefined
		) {
			if (!allowEmptyContent) {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						source,
						"Le numéro de l'étape cible est vide, liaison non fonctionnelle.",
					),
				);
			}
			return issues;
		}
		if (!Number.isInteger(stepReferral.data.targetStepNumber) || stepReferral.data.targetStepNumber < 0) {
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
	analyseInContext(
		stepReferral: StepReferralSource,
		grafcet: Grafcet,
		variables: Variable[],
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = { sourceType: "grafcet-step-referral-source" as const, sourceId: stepReferral.id };
		//Check that the target step number exists in the grafcet
		const targetStep = grafcet.steps.find((s) => s.data.number === stepReferral.data.targetStepNumber);
		if (!targetStep) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					source,
					`Aucune étape avec le numéro ${stepReferral.data.targetStepNumber} n'existe dans le grafcet.`,
				),
			);
		}

		return issues;
	}
}
