export type ProjectAnalyserIssueSeverity = "error" | "warning";

export type ProjectAnalyserIssueSource = {
	sourceType:
		| "project"
		| "grafcet"
		| "grafcet-step"
		| "grafcet-transition"
		| "grafcet-action"
		| "grafcet-step-referral-source"
		| "grafcet-step-referral-target"
		| "grafcet-junction-and-start"
		| "grafcet-junction-and-end"
		| "grafcet-junction-or-start"
		| "grafcet-junction-or-end";
	sourceId: string;
	parentId?: string; // For issues on steps, transitions or actions, the ID of the parent grafcet
};

/**
 * One entry per distinct rule, not per call site: two analysers reporting the same shape of
 * problem (e.g. both step-referral analysers rejecting an empty step number) share a code.
 *
 * Stable identifiers, not sequential numbers (`E001`...) — nothing persists a code across
 * analysis runs, so there is no renumbering-breaks-references risk, and a descriptive name
 * needs no lookup table to be understood while grepping or filtering.
 */
export const PROJECT_ANALYSER_ISSUE_CODES = [
	"PROJECT_DUPLICATE_STEP_NUMBER_ACROSS_GRAFCETS",

	"GRAFCET_TOO_FEW_STEPS",
	"GRAFCET_NO_INITIAL_STEP",
	"GRAFCET_MULTIPLE_INITIAL_STEPS",
	"GRAFCET_DISCONNECTED_COMPONENTS",

	"STEP_NUMBER_MISSING",
	"STEP_NUMBER_NOT_POSITIVE_INTEGER",
	"STEP_NUMBER_DUPLICATE",
	"STEP_NO_PREDECESSOR",
	"STEP_NO_SUCCESSOR",

	"TRANSITION_EMPTY_EXPRESSION",
	"TRANSITION_ASSIGNMENT_NOT_ALLOWED",
	"TRANSITION_NUMERIC_CONSTANT_NOT_ALLOWED",
	"TRANSITION_EXPRESSION_NOT_BOOLEAN",
	"TRANSITION_INVALID_EXPRESSION",
	"TRANSITION_NO_PREDECESSOR",
	"TRANSITION_NO_SUCCESSOR",
	"TRANSITION_MULTIPLE_SUCCESSORS",
	"TRANSITION_NON_BOOLEAN_VARIABLE_REFERENCE",
	"TRANSITION_TIMER_NAME_CONFLICT",

	"ACTION_TEXT_TYPE_NO_EFFECT",
	"ACTION_EMPTY_EXPRESSION",
	"ACTION_BOOLEAN_MUST_BE_IDENTIFIER",
	"ACTION_NUMERIC_MUST_BE_ASSIGNMENT",
	"ACTION_STRING_MUST_BE_ASSIGNMENT",
	"ACTION_INVALID_EXPRESSION",
	"ACTION_INCOMPATIBLE_EXECUTION_MODE",
	"ACTION_NOT_CONNECTED_TO_STEP",
	"ACTION_NUMERIC_TYPE_MISMATCH",
	"ACTION_STRING_TYPE_MISMATCH",

	"JUNCTION_PIVOT_NOT_CONNECTED",
	"JUNCTION_BRANCH_NOT_CONNECTED",
	"JUNCTION_AND_CONVERGENCE_WITHOUT_DIVERGENCE",
	"JUNCTION_AND_BRANCH_COUNT_MISMATCH",
	"JUNCTION_AND_DIVERGENCE_NOT_CLOSED",

	"STEP_REFERRAL_NUMBER_EMPTY",
	"STEP_REFERRAL_NUMBER_NOT_POSITIVE_INTEGER",
	"STEP_REFERRAL_REFERENCED_STEP_NOT_FOUND",
	"STEP_REFERRAL_SOURCE_MISSING_UPSTREAM_CONNECTION",
	"STEP_REFERRAL_TARGET_MISSING_DOWNSTREAM_CONNECTION",
	"STEP_REFERRAL_SELF_REFERENCE",
	"STEP_REFERRAL_NO_UPSTREAM_TENANT",
	"STEP_REFERRAL_TENANT_NO_PREDECESSOR",
	"STEP_REFERRAL_TENANT_MULTIPLE_PREDECESSORS",
	"STEP_REFERRAL_SOURCE_MISMATCH",
] as const;

export type ProjectAnalyserIssueCode = (typeof PROJECT_ANALYSER_ISSUE_CODES)[number];

export default class ProjectAnalyserIssue {
	readonly severity: ProjectAnalyserIssueSeverity;
	readonly code: ProjectAnalyserIssueCode;
	readonly source: ProjectAnalyserIssueSource;
	readonly message: string;

	constructor(
		severity: ProjectAnalyserIssueSeverity,
		code: ProjectAnalyserIssueCode,
		source: ProjectAnalyserIssueSource,
		message: string,
	) {
		this.severity = severity;
		this.code = code;
		this.source = source;
		this.message = message;
	}
}
