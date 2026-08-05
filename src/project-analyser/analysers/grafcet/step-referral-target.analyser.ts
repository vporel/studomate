import StepReferralSourceHelper from "@/schemas/grafcet/helpers/step-referral-source.helper";
import StepReferralTargetHelper from "@/schemas/grafcet/helpers/step-referral-target.helper";
import StepReferralTarget from "@/schemas/grafcet/step-referral-target.schema";
import Variable from "@/schemas/variable/variable.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
import ElementAnalyser, { ElementAnalyseIsolatedOptions } from "./element.analyser";

export default class StepReferralTargetAnalyser extends ElementAnalyser<StepReferralTarget> {
	/**
	 * Rules that apply to the step's own data, independently of the grafcet.
	 */
	analyseIsolated(
		stepReferral: StepReferralTarget,
		{ allowEmptyContent = false }: ElementAnalyseIsolatedOptions = {},
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = { sourceType: "grafcet-step-referral-target" as const, sourceId: stepReferral.id };

		if (
			stepReferral.data.sourceStepNumber === "" ||
			stepReferral.data.sourceStepNumber === null ||
			stepReferral.data.sourceStepNumber === undefined
		) {
			if (!allowEmptyContent) {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"STEP_REFERRAL_NUMBER_EMPTY",
						source,
						"Le numéro de l'étape source est vide, liaison non fonctionnelle.",
					),
				);
			}
			return issues;
		}
		if (!Number.isInteger(stepReferral.data.sourceStepNumber) || stepReferral.data.sourceStepNumber < 0) {
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
		stepReferral: StepReferralTarget,
		grafcet: Grafcet,
		_variables: Variable[],
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = { sourceType: "grafcet-step-referral-target" as const, sourceId: stepReferral.id };

		//Check that the referred step number exists in the grafcet
		const referredStep = grafcet.steps.find((s) => s.data.number === stepReferral.data.sourceStepNumber);
		if (!referredStep) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"STEP_REFERRAL_REFERENCED_STEP_NOT_FOUND",
					source,
					`Aucune étape avec le numéro ${stepReferral.data.sourceStepNumber} n'existe dans le grafcet.`,
				),
			);
		} else {
			if (!StepReferralTargetHelper.getTargetStep(stepReferral.id, grafcet)) {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"STEP_REFERRAL_TARGET_MISSING_DOWNSTREAM_CONNECTION",
						source,
						`Connexion manquante en aval,`,
					),
				);
			}
			const stepReferralSource = StepReferralTargetHelper.getStepReferralSource(
				stepReferral.id,
				grafcet,
			);
			if (!stepReferralSource) {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"STEP_REFERRAL_NO_UPSTREAM_TENANT",
						source,
						`Aucun tenant directement relié à l'étape source (sans jonction par exemple).`,
					),
				);
			} else {
				const predecessorSteps = StepReferralSourceHelper.getPredecessorSteps(
					stepReferralSource.id,
					grafcet,
				);
				if (predecessorSteps.length === 0) {
					issues.push(
						new ProjectAnalyserIssue(
							"error",
							"STEP_REFERRAL_TENANT_NO_PREDECESSOR",
							source,
							`Le tenant n'est précédé par aucune étape.`,
						),
					);
					return issues;
				}
				if (predecessorSteps.length > 1) {
					issues.push(
						new ProjectAnalyserIssue(
							"error",
							"STEP_REFERRAL_TENANT_MULTIPLE_PREDECESSORS",
							source,
							`Le tenant est précédé par plusieurs étapes, on ne peut pas déterminer laquelle est la source référencée.`,
						),
					);
					return issues;
				}
				const sourceStep = predecessorSteps[0];

				if (!sourceStep || sourceStep.data.number !== stepReferral.data.sourceStepNumber) {
					issues.push(
						new ProjectAnalyserIssue(
							"error",
							"STEP_REFERRAL_SOURCE_MISMATCH",
							source,
							`L'étape source référencée ne correspond pas à l'étape liée au tenant.`,
						),
					);
				}
			}
		}

		return issues;
	}
}
