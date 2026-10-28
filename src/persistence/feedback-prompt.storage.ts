import {
	FeedbackPromptState,
	normalizeFeedbackPromptState,
} from "@/feedback/feedback-prompt";
import { readJson, writeJson } from "./safe-local-storage";

const STORAGE_KEY = "studomate_feedback_prompt";

export function getFeedbackPromptState(): FeedbackPromptState {
	return normalizeFeedbackPromptState(readJson(STORAGE_KEY));
}

/** Applies `update` to the stored state, persists the result and returns it. */
export function updateFeedbackPromptState(
	update: (state: FeedbackPromptState) => FeedbackPromptState,
): FeedbackPromptState {
	const next = update(getFeedbackPromptState());
	writeJson(STORAGE_KEY, next);
	return next;
}
