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
		| "grafcet-junction-or-end"
		| "ladder"
		| "ladder-network"
		| "ladder-contact"
		| "ladder-coil"
		| "ladder-block";
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
	"PROJECT_MISSING_ANALYSER_FOR_NOTATION",
	"PROJECT_MISSING_MAIN",
	"PROJECT_MULTIPLE_MAINS",
	"LADDER_NOT_REFERENCED",

	"GRAFCET_TOO_FEW_STEPS",
	"GRAFCET_NO_INITIAL_STEP",
	"GRAFCET_MULTIPLE_INITIAL_STEPS",
	"GRAFCET_DISCONNECTED_COMPONENTS",
	"GRAFCET_CONNECTION_DANGLING_ELEMENT",
	"GRAFCET_CONNECTION_INVALID_TYPE",
	"GRAFCET_UNREACHABLE_STEPS",
	"GRAFCET_DEAD_END_STEPS",
	"GRAFCET_STEP_VARIABLE_NAME_CONFLICT",
	"GRAFCET_DUPLICATE_TIMER_NAME",

	"STEP_NUMBER_MISSING",
	"STEP_NUMBER_NOT_POSITIVE_INTEGER",
	"STEP_NUMBER_DUPLICATE",
	"STEP_NO_PREDECESSOR",
	"STEP_NO_SUCCESSOR",
	"STEP_MULTIPLE_SUCCESSORS",

	"TRANSITION_EMPTY_EXPRESSION",
	"TRANSITION_ASSIGNMENT_NOT_ALLOWED",
	"TRANSITION_NUMERIC_CONSTANT_NOT_ALLOWED",
	"TRANSITION_EXPRESSION_NOT_BOOLEAN",
	"TRANSITION_INVALID_EXPRESSION",
	"TRANSITION_NO_PREDECESSOR",
	"TRANSITION_NO_SUCCESSOR",
	"TRANSITION_MULTIPLE_SUCCESSORS",
	"TRANSITION_MULTIPLE_PREDECESSORS",
	"TRANSITION_NON_BOOLEAN_VARIABLE_REFERENCE",
	"TRANSITION_TIMER_NAME_CONFLICT",

	"ACTION_EMPTY_EXPRESSION",
	"ACTION_BOOLEAN_MUST_BE_IDENTIFIER",
	"ACTION_NUMERIC_MUST_BE_ASSIGNMENT",
	"ACTION_STRING_MUST_BE_ASSIGNMENT",
	"ACTION_INVALID_EXPRESSION",
	"ACTION_INCOMPATIBLE_EXECUTION_MODE",
	"ACTION_NOT_CONNECTED_TO_STEP",
	"ACTION_NUMERIC_TYPE_MISMATCH",
	"ACTION_STRING_TYPE_MISMATCH",
	"ACTION_VARIABLE_IS_INPUT",
	"ACTION_STEP_VARIABLE_READONLY",
	"ACTION_SET_RESET_CONFLICT_SAME_STEP",

	"JUNCTION_PIVOT_NOT_CONNECTED",
	"JUNCTION_BRANCH_NOT_CONNECTED",
	"JUNCTION_AND_CONVERGENCE_WITHOUT_DIVERGENCE",
	"JUNCTION_AND_BRANCH_COUNT_MISMATCH",
	"JUNCTION_AND_DIVERGENCE_NOT_CLOSED",
	"JUNCTION_OR_MIN_BRANCHES",
	"JUNCTION_OR_START_BRANCH_NOT_TRANSITION",
	"JUNCTION_OR_END_BRANCH_NOT_TRANSITION",
	"JUNCTION_OR_START_BRANCHES_NOT_EXCLUSIVE",

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

	"LADDER_NETWORK_NO_COIL",
	"LADDER_CONTACT_VARIABLE_UNDECLARED",
	"LADDER_CONTACT_VARIABLE_NOT_BOOLEAN",
	"LADDER_COIL_VARIABLE_UNDECLARED",
	"LADDER_COIL_VARIABLE_NOT_BOOLEAN",
	"LADDER_COIL_DUPLICATE_NORMAL_ASSIGNMENT",
	"LADDER_ELEMENT_NO_PREDECESSOR",
	"LADDER_COIL_VARIABLE_IS_INPUT",

	"BLOCK_PROGRAM_UNDECLARED",
	"BLOCK_PROGRAM_NOT_LADDER",
	"BLOCK_PROGRAM_IS_MAIN",
	"BLOCK_PROGRAM_DUPLICATE_REFERENCE",
	"BLOCK_PROGRAM_CALL_CYCLE",

	"BLOCK_NAME_DUPLICATE",
	"BLOCK_NAME_VARIABLE_CONFLICT",

	"LADDER_CONNECTION_INVALID_ORDER",

	"BLOCK_TIMER_NAME_INVALID",
	"BLOCK_TIMER_PT_EMPTY",
	"BLOCK_TIMER_PT_INVALID_CONSTANT",
	"BLOCK_TIMER_PT_UNDECLARED_VARIABLE",
	"BLOCK_TIMER_PT_INVALID_TYPE",
	"BLOCK_TIMER_ET_UNDECLARED_VARIABLE",
	"BLOCK_TIMER_ET_INVALID_TYPE",

	"BLOCK_COUNTER_NAME_INVALID",
	"BLOCK_COUNTER_CONTROL_EMPTY",
	"BLOCK_COUNTER_CONTROL_UNDECLARED_VARIABLE",
	"BLOCK_COUNTER_CONTROL_INVALID_TYPE",
	"BLOCK_COUNTER_PV_EMPTY",
	"BLOCK_COUNTER_PV_UNDECLARED_VARIABLE",
	"BLOCK_COUNTER_PV_INVALID_TYPE",
	"BLOCK_COUNTER_CV_UNDECLARED_VARIABLE",
	"BLOCK_COUNTER_CV_INVALID_TYPE",

	"BLOCK_COMPARE_IN1_EMPTY",
	"BLOCK_COMPARE_IN2_EMPTY",
	"BLOCK_COMPARE_OPERATOR_INVALID",
	"BLOCK_COMPARE_INPUT_NOT_ALLOWED",
	"BLOCK_COMPARE_INVALID_EXPRESSION",

	"BLOCK_ASSIGN_IN_EMPTY",
	"BLOCK_ASSIGN_OUT_EMPTY",
	"BLOCK_ASSIGN_IN_NOT_ALLOWED",
	"BLOCK_ASSIGN_OUT_NOT_A_VARIABLE",
	"BLOCK_ASSIGN_INVALID",

	"BLOCK_ARITHMETIC_IN1_EMPTY",
	"BLOCK_ARITHMETIC_IN2_EMPTY",
	"BLOCK_ARITHMETIC_OUT_EMPTY",
	"BLOCK_ARITHMETIC_OPERATOR_INVALID",
	"BLOCK_ARITHMETIC_INPUT_NOT_ALLOWED",
	"BLOCK_ARITHMETIC_OUT_NOT_A_VARIABLE",
	"BLOCK_ARITHMETIC_INVALID",
] as const;

export type ProjectAnalyserIssueCode =
	(typeof PROJECT_ANALYSER_ISSUE_CODES)[number];

/**
 * Valeurs interpolées dans le message localisé du `code` (`{variableName}`, `{stepNumber}`…).
 * Le domaine ne produit jamais de texte : il décrit le problème par un `code` stable et ces
 * paramètres, et le rendu se fait dans `src/bridge/` (voir `AnalysisIssuesMapper`).
 */
export type ProjectAnalyserIssueParams = Record<string, string | number>;

export default class ProjectAnalyserIssue {
	readonly severity: ProjectAnalyserIssueSeverity;
	readonly code: ProjectAnalyserIssueCode;
	readonly source: ProjectAnalyserIssueSource;
	readonly params: ProjectAnalyserIssueParams;
	/**
	 * Exception attrapée par l'analyseur (lexer/parser/analyse sémantique d'une expression) —
	 * son message lisible est produit par `SimulatorExceptionsMapper` au moment du rendu, dans
	 * la langue de l'interface. Renseigné uniquement pour les codes `*_INVALID_EXPRESSION`.
	 */
	readonly cause?: unknown;

	constructor(
		severity: ProjectAnalyserIssueSeverity,
		code: ProjectAnalyserIssueCode,
		source: ProjectAnalyserIssueSource,
		params: ProjectAnalyserIssueParams = {},
		cause?: unknown,
	) {
		this.severity = severity;
		this.code = code;
		this.source = source;
		this.params = params;
		this.cause = cause;
	}
}
