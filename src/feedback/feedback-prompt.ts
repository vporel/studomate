/** Something the user did that is worth asking their opinion after. */
export type FeedbackMilestone =
	"program-created" | "simulation-ended" | "pdf-exported";

export const FEEDBACK_VISITS_BEFORE_ASK = 3;
export const FEEDBACK_VISITS_BEFORE_REASK = 10;
export const FEEDBACK_RATING_MAX = 5;
export const FEEDBACK_COMMENT_MAX_LENGTH = 2000;

/**
 * What this browser knows about the feedback request. `visitCount` counts distinct calendar days
 * on which the app was opened, so several page loads in one sitting are one visit.
 */
export type FeedbackPromptState = {
	hasContent: boolean;
	hasSimulatedOrExported: boolean;
	visitCount: number;
	lastVisitDay: string | null;
	dismissCount: number;
	dismissedAtVisitCount: number;
	answered: boolean;
};

export const EMPTY_FEEDBACK_PROMPT_STATE: FeedbackPromptState = {
	hasContent: false,
	hasSimulatedOrExported: false,
	visitCount: 0,
	lastVisitDay: null,
	dismissCount: 0,
	dismissedAtVisitCount: 0,
	answered: false,
};

const count = (value: unknown): number =>
	typeof value === "number" && Number.isInteger(value) && value >= 0
		? value
		: 0;

export function normalizeFeedbackPromptState(
	raw: unknown,
): FeedbackPromptState {
	if (typeof raw !== "object" || raw === null)
		return EMPTY_FEEDBACK_PROMPT_STATE;
	const r = raw as Record<string, unknown>;
	return {
		hasContent: r.hasContent === true,
		hasSimulatedOrExported: r.hasSimulatedOrExported === true,
		visitCount: count(r.visitCount),
		lastVisitDay: typeof r.lastVisitDay === "string" ? r.lastVisitDay : null,
		dismissCount: count(r.dismissCount),
		dismissedAtVisitCount: count(r.dismissedAtVisitCount),
		answered: r.answered === true,
	};
}

/** Local calendar day as `YYYY-MM-DD`. */
export function localDayKey(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

export function recordVisit(
	state: FeedbackPromptState,
	day: string,
): FeedbackPromptState {
	if (state.lastVisitDay === day) return state;
	return {
		...state,
		visitCount: state.visitCount + 1,
		lastVisitDay: day,
	};
}

export function recordMilestone(
	state: FeedbackPromptState,
	milestone: FeedbackMilestone,
): FeedbackPromptState {
	if (milestone === "program-created") {
		return state.hasContent ? state : { ...state, hasContent: true };
	}
	return state.hasSimulatedOrExported
		? state
		: { ...state, hasSimulatedOrExported: true };
}

/** "Plus tard": the request comes back once, after more visits. */
export function postpone(state: FeedbackPromptState): FeedbackPromptState {
	return {
		...state,
		dismissCount: state.dismissCount + 1,
		dismissedAtVisitCount: state.visitCount,
	};
}

export function markAnswered(state: FeedbackPromptState): FeedbackPromptState {
	return { ...state, answered: true };
}

/**
 * Whether the request should be shown at the next milestone. The first request needs real use
 * (a program created, then a simulation or an export) or enough visits; the single reminder
 * waits for the tenth visit and for a visit later than the one that postponed it.
 */
export function isFeedbackPromptDue(state: FeedbackPromptState): boolean {
	if (state.answered) return false;
	if (state.dismissCount === 0) {
		return (
			(state.hasContent && state.hasSimulatedOrExported) ||
			state.visitCount >= FEEDBACK_VISITS_BEFORE_ASK
		);
	}
	if (state.dismissCount === 1) {
		return (
			state.visitCount >= FEEDBACK_VISITS_BEFORE_REASK &&
			state.visitCount > state.dismissedAtVisitCount
		);
	}
	return false;
}
