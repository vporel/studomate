import { EMPTY_FEEDBACK_PROMPT_STATE } from "@/feedback/feedback-prompt";
import { installMemoryLocalStorage } from "@tests/utils/local-storage-stub";
import {
	getFeedbackPromptState,
	updateFeedbackPromptState,
} from "./feedback-prompt.storage";

describe("feedback-prompt.storage", () => {
	let store: Map<string, string>;
	let restoreLocalStorage: () => void;

	beforeEach(() => {
		({ store, restore: restoreLocalStorage } = installMemoryLocalStorage());
	});

	afterEach(() => {
		restoreLocalStorage();
		delete (globalThis as any).localStorage;
	});

	it("returns the empty state when nothing is stored", () => {
		expect(getFeedbackPromptState()).toEqual(EMPTY_FEEDBACK_PROMPT_STATE);
	});

	it("returns the empty state when the stored value is corrupted", () => {
		store.set("studomate_feedback_prompt", "{not json");
		expect(getFeedbackPromptState()).toEqual(EMPTY_FEEDBACK_PROMPT_STATE);
	});

	it("persists the result of an update and returns it", () => {
		const next = updateFeedbackPromptState((state) => ({
			...state,
			visitCount: 2,
		}));

		expect(next.visitCount).toBe(2);
		expect(getFeedbackPromptState().visitCount).toBe(2);
	});

	it("applies an update on top of what is already stored", () => {
		updateFeedbackPromptState((state) => ({ ...state, hasContent: true }));
		updateFeedbackPromptState((state) => ({ ...state, visitCount: 1 }));

		expect(getFeedbackPromptState()).toMatchObject({
			hasContent: true,
			visitCount: 1,
		});
	});
});
