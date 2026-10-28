import {
	isFeedbackPromptDue,
	localDayKey,
	markAnswered,
	postpone,
	recordMilestone,
	recordVisit,
	type FeedbackMilestone,
} from "@/feedback/feedback-prompt";
import {
	getFeedbackPromptState,
	updateFeedbackPromptState,
} from "@/persistence/feedback-prompt.storage";
import { feedbackStore } from "@/ui/stores/feedback/feedback.store";
import { getShareTokenFromUrl } from "@/ui/stores/project/url/project-url";

/** Counts today as a visit of the app. */
export function recordFeedbackVisit(now: Date = new Date()): void {
	updateFeedbackPromptState((state) => recordVisit(state, localDayKey(now)));
}

export const FEEDBACK_PROMPT_DELAY_MS = 3000;

let pendingOpening: ReturnType<typeof setTimeout> | null = null;

function openIfStillDue(): void {
	pendingOpening = null;
	if (
		isFeedbackPromptDue(getFeedbackPromptState()) &&
		getShareTokenFromUrl() === null
	)
		feedbackStore.getState().open("prompt");
}

/**
 * Remembers what the user just did and, when it is time to ask, opens the feedback box a few
 * seconds later so that it does not land on the result of what they just did.
 */
export default function notifyFeedbackMilestone(
	milestone: FeedbackMilestone,
): void {
	const state = updateFeedbackPromptState((current) =>
		recordMilestone(current, milestone),
	);
	if (!isFeedbackPromptDue(state) || pendingOpening !== null) return;
	pendingOpening = setTimeout(openIfStillDue, FEEDBACK_PROMPT_DELAY_MS);
}

/** "Plus tard": the box closes and comes back once, after more visits. */
export function postponeFeedbackPrompt(): void {
	updateFeedbackPromptState(postpone);
	feedbackStore.getState().close();
}

export function completeFeedbackPrompt(): void {
	updateFeedbackPromptState(markAnswered);
	feedbackStore.getState().close();
}

export function openFeedbackFromMenu(): void {
	feedbackStore.getState().open("menu");
}

/** The signed-in user already left an opinion, possibly from another browser. */
export function markFeedbackAlreadyGiven(): void {
	updateFeedbackPromptState(markAnswered);
	if (feedbackStore.getState().source === "prompt")
		feedbackStore.getState().close();
}
