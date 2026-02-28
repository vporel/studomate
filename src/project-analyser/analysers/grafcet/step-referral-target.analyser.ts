import StepReferralTargetHelper from "@/schemas/grafcet/helpers/step-referral-target.helper";
import StepReferralTarget from "@/schemas/grafcet/step-referral-target.schema";
import Variable from "@/schemas/variable/variable.schema";
import Grafcet from "../../../schemas/grafcet/grafcet.schema";
import ProjectAnalyserIssue from "../../project.analyser.issue";
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
		variables: Variable[],
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = { sourceType: "grafcet-step-referral-target" as const, sourceId: stepReferral.id };

		//Check that the referred step number exists in the grafcet
		const referredStep = grafcet.steps.find((s) => s.data.number === stepReferral.data.sourceStepNumber);
		if (!referredStep) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					source,
					`Aucune étape avec le numéro ${stepReferral.data.sourceStepNumber} n'existe dans le grafcet.`,
				),
			);
		}

		if (!StepReferralTargetHelper.getTargetStep(stepReferral.id, grafcet)) {
			issues.push(new ProjectAnalyserIssue("error", source, `Connexion manquante en aval,`));
		}

		if (StepReferralTargetHelper.getStepReferralSource(stepReferral.id, grafcet)) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					source,
					`Aucun tenant directement relié à l'étape source (sans jonction par exemple).`,
				),
			);
		}

		return issues;
	}
}
