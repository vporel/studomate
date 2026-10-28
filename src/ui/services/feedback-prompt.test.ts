import { getFeedbackPromptState } from "@/persistence/feedback-prompt.storage";
import { feedbackStore } from "@/ui/stores/feedback/feedback.store";
import { installMemoryLocalStorage } from "@tests/utils/local-storage-stub";
import notifyFeedbackMilestone, {
	FEEDBACK_PROMPT_DELAY_MS,
	completeFeedbackPrompt,
	markFeedbackAlreadyGiven,
	openFeedbackFromMenu,
	postponeFeedbackPrompt,
	recordFeedbackVisit,
} from "./feedback-prompt";

const mockGetShareToken = jest.fn();
jest.mock("@/ui/stores/project/url/project-url", () => ({
	getShareTokenFromUrl: () => mockGetShareToken(),
}));

describe("feedback-prompt service", () => {
	let restoreLocalStorage: () => void;

	beforeEach(() => {
		jest.useFakeTimers();
		({ restore: restoreLocalStorage } = installMemoryLocalStorage());
		mockGetShareToken.mockReturnValue(null);
		feedbackStore.getState().close();
	});

	afterEach(() => {
		jest.runOnlyPendingTimers();
		jest.useRealTimers();
		restoreLocalStorage();
		delete (globalThis as any).localStorage;
		feedbackStore.getState().close();
	});

	const waitForPrompt = () =>
		jest.advanceTimersByTime(FEEDBACK_PROMPT_DELAY_MS);

	const visitOnDays = (days: number) => {
		for (let i = 1; i <= days; i++)
			recordFeedbackVisit(new Date(2026, 9, i, 12));
	};

	describe("recordFeedbackVisit", () => {
		it("counts one visit per calendar day", () => {
			recordFeedbackVisit(new Date(2026, 9, 28, 9));
			recordFeedbackVisit(new Date(2026, 9, 28, 17));
			recordFeedbackVisit(new Date(2026, 9, 29, 9));

			expect(getFeedbackPromptState().visitCount).toBe(2);
		});
	});

	describe("notifyFeedbackMilestone", () => {
		it("stays silent while the user has done little", () => {
			notifyFeedbackMilestone("program-created");

			expect(feedbackStore.getState().source).toBeNull();
			expect(getFeedbackPromptState().hasContent).toBe(true);
		});

		it("asks once a program exists and a simulation ended", () => {
			notifyFeedbackMilestone("program-created");
			notifyFeedbackMilestone("simulation-ended");
			waitForPrompt();

			expect(feedbackStore.getState().source).toBe("prompt");
		});

		it("waits a few seconds before opening the box", () => {
			notifyFeedbackMilestone("program-created");
			notifyFeedbackMilestone("simulation-ended");

			jest.advanceTimersByTime(FEEDBACK_PROMPT_DELAY_MS - 1);
			expect(feedbackStore.getState().source).toBeNull();

			jest.advanceTimersByTime(1);
			expect(feedbackStore.getState().source).toBe("prompt");
		});

		it("opens the box once when several milestones follow each other", () => {
			notifyFeedbackMilestone("program-created");
			notifyFeedbackMilestone("simulation-ended");
			notifyFeedbackMilestone("pdf-exported");
			waitForPrompt();
			feedbackStore.getState().close();

			waitForPrompt();

			expect(feedbackStore.getState().source).toBeNull();
		});

		it("does not open the box if the user answered during the wait", () => {
			notifyFeedbackMilestone("program-created");
			notifyFeedbackMilestone("simulation-ended");

			markFeedbackAlreadyGiven();
			waitForPrompt();

			expect(feedbackStore.getState().source).toBeNull();
		});

		it("asks after a PDF export for someone who never simulates", () => {
			notifyFeedbackMilestone("program-created");
			notifyFeedbackMilestone("pdf-exported");
			waitForPrompt();

			expect(feedbackStore.getState().source).toBe("prompt");
		});

		it("on the third visit, waits for an action instead of asking at once", () => {
			visitOnDays(3);
			expect(feedbackStore.getState().source).toBeNull();

			notifyFeedbackMilestone("program-created");
			waitForPrompt();

			expect(feedbackStore.getState().source).toBe("prompt");
		});

		it("does not ask someone who opened a shared link", () => {
			visitOnDays(3);
			mockGetShareToken.mockReturnValue("token");

			notifyFeedbackMilestone("program-created");
			waitForPrompt();

			expect(feedbackStore.getState().source).toBeNull();
		});
	});

	describe("postponeFeedbackPrompt", () => {
		it("closes the box and does not ask again on the next action", () => {
			visitOnDays(3);
			notifyFeedbackMilestone("program-created");
			waitForPrompt();

			postponeFeedbackPrompt();
			notifyFeedbackMilestone("simulation-ended");
			waitForPrompt();

			expect(feedbackStore.getState().source).toBeNull();
			expect(getFeedbackPromptState().dismissCount).toBe(1);
		});

		it("asks again from the tenth visit", () => {
			visitOnDays(3);
			notifyFeedbackMilestone("program-created");
			waitForPrompt();
			postponeFeedbackPrompt();

			for (let i = 4; i <= 10; i++)
				recordFeedbackVisit(new Date(2026, 9, i, 12));
			notifyFeedbackMilestone("simulation-ended");
			waitForPrompt();

			expect(feedbackStore.getState().source).toBe("prompt");
		});
	});

	describe("completeFeedbackPrompt", () => {
		it("closes the box and never asks again", () => {
			visitOnDays(20);
			notifyFeedbackMilestone("program-created");
			waitForPrompt();

			completeFeedbackPrompt();
			notifyFeedbackMilestone("simulation-ended");
			waitForPrompt();

			expect(feedbackStore.getState().source).toBeNull();
			expect(getFeedbackPromptState().answered).toBe(true);
		});
	});

	describe("markFeedbackAlreadyGiven", () => {
		it("never asks again and closes a box opened by the app", () => {
			visitOnDays(3);
			notifyFeedbackMilestone("program-created");
			waitForPrompt();

			markFeedbackAlreadyGiven();

			expect(feedbackStore.getState().source).toBeNull();
			expect(getFeedbackPromptState().answered).toBe(true);
		});

		it("leaves a box the user opened from the menu", () => {
			openFeedbackFromMenu();

			markFeedbackAlreadyGiven();

			expect(feedbackStore.getState().source).toBe("menu");
		});
	});

	describe("openFeedbackFromMenu", () => {
		it("opens the box whatever the state, without touching it", () => {
			openFeedbackFromMenu();

			expect(feedbackStore.getState().source).toBe("menu");
			expect(getFeedbackPromptState().dismissCount).toBe(0);
		});

		it("does not replace a box that is already open", () => {
			visitOnDays(3);
			notifyFeedbackMilestone("program-created");
			waitForPrompt();

			openFeedbackFromMenu();

			expect(feedbackStore.getState().source).toBe("prompt");
		});
	});
});
