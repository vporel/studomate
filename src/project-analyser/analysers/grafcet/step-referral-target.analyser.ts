import StepReferralSourceHelper from "@/schemas/grafcet/helpers/step-referral-source.helper";
import StepReferralTargetHelper from "@/schemas/grafcet/helpers/step-referral-target.helper";
import StepReferralTarget from "@/schemas/grafcet/step-referral-target.schema";
import { Environment } from "@/simulator/interpreter/environment/environment";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
import GrafcetElementAnalyser, {
	ElementAnalyseIsolatedOptions,
} from "./element.analyser";

export default class StepReferralTargetAnalyser extends GrafcetElementAnalyser<StepReferralTarget> {
	/**
	 * Rules that apply to the step's own data, independently of the grafcet.
	 */
	analyseIsolated(
		stepReferral: StepReferralTarget,
		{ allowEmptyContent = false }: ElementAnalyseIsolatedOptions = {},
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = {
			sourceType: "grafcet-step-referral-target" as const,
			sourceId: stepReferral.id,
		};

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
					),
				);
			}
			return issues;
		}
		if (
			!Number.isInteger(stepReferral.data.sourceStepNumber) ||
			stepReferral.data.sourceStepNumber < 0
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
		stepReferral: StepReferralTarget,
		grafcet: Grafcet,
		_environment: Environment,
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = {
			sourceType: "grafcet-step-referral-target" as const,
			sourceId: stepReferral.id,
		};

		//Check that the referred step number exists in the grafcet
		const referredStep = Object.values(grafcet.steps).find(
			(s) => s.data.number === stepReferral.data.sourceStepNumber,
		);
		if (!referredStep) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"STEP_REFERRAL_REFERENCED_STEP_NOT_FOUND",
					source,
					{ stepNumber: stepReferral.data.sourceStepNumber as number },
				),
			);
		} else {
			// Une connexion structurellement invalide (type inattendu) est déjà relevée par la
			// règle de niveau grafcet GRAFCET_CONNECTION_INVALID_TYPE ; on l'avale ici pour ne
			// pas rompre le contrat "l'analyse ne lève jamais".
			try {
				if (!StepReferralTargetHelper.getTargetStep(stepReferral.id, grafcet)) {
					issues.push(
						new ProjectAnalyserIssue(
							"error",
							"STEP_REFERRAL_TARGET_MISSING_DOWNSTREAM_CONNECTION",
							source,
						),
					);
				}
				const stepReferralSource =
					StepReferralTargetHelper.getStepReferralSource(
						stepReferral.id,
						grafcet,
					);
				if (!stepReferralSource) {
					issues.push(
						new ProjectAnalyserIssue(
							"error",
							"STEP_REFERRAL_NO_UPSTREAM_TENANT",
							source,
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
							),
						);
						return issues;
					}
					const sourceStep = predecessorSteps[0];

					if (
						!sourceStep ||
						sourceStep.data.number !== stepReferral.data.sourceStepNumber
					) {
						issues.push(
							new ProjectAnalyserIssue(
								"error",
								"STEP_REFERRAL_SOURCE_MISMATCH",
								source,
							),
						);
					}
				}
			} catch {
				return issues;
			}
		}

		return issues;
	}
}
