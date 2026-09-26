import ProjectAnalyserIssue, {
	ProjectAnalyserIssueSource,
} from "@/project-analyser/project.analyser.issue";
import Grafcet from "@/schemas/grafcet/grafcet.schema";

/**
 * Checks the step number a referral points to (or comes from): it must be filled (unless
 * `allowEmptyContent`) and be a positive integer.
 */
export function validateStepReferralNumber(
	value: number | "" | null | undefined,
	source: ProjectAnalyserIssueSource,
	allowEmptyContent: boolean,
): ProjectAnalyserIssue[] {
	if (value === "" || value === null || value === undefined) {
		return allowEmptyContent
			? []
			: [
					new ProjectAnalyserIssue(
						"error",
						"STEP_REFERRAL_NUMBER_EMPTY",
						source,
					),
				];
	}
	if (!Number.isInteger(value) || value < 0) {
		return [
			new ProjectAnalyserIssue(
				"error",
				"STEP_REFERRAL_NUMBER_NOT_POSITIVE_INTEGER",
				source,
			),
		];
	}
	return [];
}

export function checkReferredStepExists(
	stepNumber: number | "" | null | undefined,
	grafcet: Grafcet,
	source: ProjectAnalyserIssueSource,
): ProjectAnalyserIssue[] {
	const exists = Object.values(grafcet.steps).some(
		(s) => s.data.number === stepNumber,
	);
	if (exists) return [];
	return [
		new ProjectAnalyserIssue(
			"error",
			"STEP_REFERRAL_REFERENCED_STEP_NOT_FOUND",
			source,
			{ stepNumber: stepNumber as number },
		),
	];
}
