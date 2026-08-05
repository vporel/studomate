import StepReferralSourceHelper from "@/schemas/grafcet/helpers/step-referral-source.helper";
import StepReferralSource from "@/schemas/grafcet/step-referral-source.schema";
import Variable from "@/schemas/variable/variable.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
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
						"STEP_REFERRAL_NUMBER_EMPTY",
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
					"STEP_REFERRAL_NUMBER_NOT_POSITIVE_INTEGER",
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
		_variables: Variable[],
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = { sourceType: "grafcet-step-referral-source" as const, sourceId: stepReferral.id };
		//Check that the referred step number exists in the grafcet
		const referredStep = grafcet.steps.find((s) => s.data.number === stepReferral.data.targetStepNumber);
		if (!referredStep) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"STEP_REFERRAL_REFERENCED_STEP_NOT_FOUND",
					source,
					`Aucune étape avec le numéro ${stepReferral.data.targetStepNumber} n'existe dans le grafcet.`,
				),
			);
		}

		if (!StepReferralSourceHelper.hasPredecessor(stepReferral.id, grafcet)) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"STEP_REFERRAL_SOURCE_MISSING_UPSTREAM_CONNECTION",
					source,
					`Connexion manquante en amont.`,
				),
			);
		}

		//Check that the target step is not the same as the source step (no self-referral)
		const directUniquePredecessorStep = StepReferralSourceHelper.getDirectUniquePredecessorStep(
			stepReferral.id,
			grafcet,
		);
		if (
			directUniquePredecessorStep &&
			directUniquePredecessorStep.data.number === stepReferral.data.targetStepNumber
		) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"STEP_REFERRAL_SELF_REFERENCE",
					source,
					`Le tenant ne peut pas référer l'étape dont il dépend directement.`,
				),
			);
		}

		return issues;
	}
}
