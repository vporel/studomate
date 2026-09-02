import StepReferralSourceHelper from "@/schemas/grafcet/helpers/step-referral-source.helper";
import StepReferralSource from "@/schemas/grafcet/step-referral-source.schema";
import { Environment } from "@/simulator/interpreter/environment/environment";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
import GrafcetElementAnalyser, {
	ElementAnalyseIsolatedOptions,
} from "./element.analyser";

export default class StepReferralSourceAnalyser extends GrafcetElementAnalyser<StepReferralSource> {
	/**
	 * Rules that apply to the step's own data, independently of the grafcet.
	 */
	analyseIsolated(
		stepReferral: StepReferralSource,
		{ allowEmptyContent = false }: ElementAnalyseIsolatedOptions = {},
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = {
			sourceType: "grafcet-step-referral-source" as const,
			sourceId: stepReferral.id,
		};

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
					),
				);
			}
			return issues;
		}
		if (
			!Number.isInteger(stepReferral.data.targetStepNumber) ||
			stepReferral.data.targetStepNumber < 0
		) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"STEP_REFERRAL_NUMBER_NOT_POSITIVE_INTEGER",
					source,
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
		_environment: Environment,
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = {
			sourceType: "grafcet-step-referral-source" as const,
			sourceId: stepReferral.id,
		};
		//Check that the referred step number exists in the grafcet
		const referredStep = Object.values(grafcet.steps).find(
			(s) => s.data.number === stepReferral.data.targetStepNumber,
		);
		if (!referredStep) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"STEP_REFERRAL_REFERENCED_STEP_NOT_FOUND",
					source,
					{ stepNumber: stepReferral.data.targetStepNumber as number },
				),
			);
		}

		if (!StepReferralSourceHelper.hasPredecessor(stepReferral.id, grafcet)) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"STEP_REFERRAL_SOURCE_MISSING_UPSTREAM_CONNECTION",
					source,
				),
			);
		}

		//Check that the target step is not the same as the source step (no self-referral)
		const directUniquePredecessorStep =
			StepReferralSourceHelper.getDirectUniquePredecessorStep(
				stepReferral.id,
				grafcet,
			);
		if (
			directUniquePredecessorStep &&
			directUniquePredecessorStep.data.number ===
				stepReferral.data.targetStepNumber
		) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"STEP_REFERRAL_SELF_REFERENCE",
					source,
				),
			);
		}

		return issues;
	}
}
