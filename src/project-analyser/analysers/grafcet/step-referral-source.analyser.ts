import StepReferralSourceHelper from "@/schemas/grafcet/helpers/step-referral-source.helper";
import StepReferralSource from "@/schemas/grafcet/step-referral-source.schema";
import { Environment } from "@/simulator/interpreter/environment/environment";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
import {
	checkReferredStepExists,
	validateStepReferralNumber,
} from "./step-referral-number.validator";
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
		const source = {
			sourceType: "grafcet-step-referral-source" as const,
			sourceId: stepReferral.id,
		};

		return validateStepReferralNumber(
			stepReferral.data.targetStepNumber,
			source,
			allowEmptyContent,
		);
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
		issues.push(
			...checkReferredStepExists(
				stepReferral.data.targetStepNumber,
				grafcet,
				source,
			),
		);

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
