/**
 * @jest-environment jsdom
 */
import { getFeedbackPromptState } from "@/persistence/feedback-prompt.storage";
import { feedbackStore } from "@/ui/stores/feedback/feedback.store";
import { act, render, waitFor } from "@testing-library/react";
import FeedbackPrompt from "./FeedbackPrompt";

const mockGetShareToken = jest.fn();
jest.mock("@/ui/stores/project/url/project-url", () => ({
	getShareTokenFromUrl: () => mockGetShareToken(),
}));
jest.mock("./FeedbackBox", () => ({
	__esModule: true,
	default: () => <div data-testid="box" />,
}));

let mockUserId: string | null = null;
jest.mock("@/ui/stores/auth/auth.store", () => ({
	useAuthStore: (selector: (s: unknown) => unknown) =>
		selector({ user: mockUserId ? { id: mockUserId } : null }),
}));

const mockHasGivenFeedback = jest.fn();
jest.mock("@/ui/services/has-given-feedback", () => ({
	__esModule: true,
	default: (...args: unknown[]) => mockHasGivenFeedback(...args),
}));

describe("FeedbackPrompt", () => {
	beforeEach(() => {
		localStorage.clear();
		jest.clearAllMocks();
		mockUserId = null;
		mockGetShareToken.mockReturnValue(null);
		mockHasGivenFeedback.mockResolvedValue(false);
		act(() => feedbackStore.getState().close());
	});

	it("counts the visit once on mount", () => {
		const { getByTestId } = render(<FeedbackPrompt />);

		expect(getFeedbackPromptState().visitCount).toBe(1);
		expect(getByTestId("box")).toBeTruthy();
	});

	it("does not count the visit of someone opening a shared link", () => {
		mockGetShareToken.mockReturnValue("token");

		render(<FeedbackPrompt />);

		expect(getFeedbackPromptState().visitCount).toBe(0);
	});

	it("does not look for past opinions of a visitor without account", () => {
		render(<FeedbackPrompt />);

		expect(mockHasGivenFeedback).not.toHaveBeenCalled();
	});

	it("stops asking a signed-in user who already gave an opinion", async () => {
		mockUserId = "user-1";
		mockHasGivenFeedback.mockResolvedValue(true);

		render(<FeedbackPrompt />);

		await waitFor(() => expect(getFeedbackPromptState().answered).toBe(true));
		expect(mockHasGivenFeedback).toHaveBeenCalledWith("user-1");
	});

	it("keeps asking a signed-in user who never gave one", async () => {
		mockUserId = "user-1";

		render(<FeedbackPrompt />);

		await waitFor(() => expect(mockHasGivenFeedback).toHaveBeenCalled());
		expect(getFeedbackPromptState().answered).toBe(false);
	});

	it("does not query again once this browser knows the user answered", () => {
		mockUserId = "user-1";
		localStorage.setItem(
			"studomate_feedback_prompt",
			JSON.stringify({ answered: true }),
		);

		render(<FeedbackPrompt />);

		expect(mockHasGivenFeedback).not.toHaveBeenCalled();
	});

	it("closes a box the app opened by itself when the user turns out to have answered", async () => {
		mockUserId = "user-1";
		let resolve!: (given: boolean) => void;
		mockHasGivenFeedback.mockReturnValue(
			new Promise<boolean>((r) => (resolve = r)),
		);
		render(<FeedbackPrompt />);
		act(() => feedbackStore.getState().open("prompt"));

		await act(async () => resolve(true));

		expect(feedbackStore.getState().source).toBeNull();
	});

	it("leaves open a box the user opened from the menu", async () => {
		mockUserId = "user-1";
		let resolve!: (given: boolean) => void;
		mockHasGivenFeedback.mockReturnValue(
			new Promise<boolean>((r) => (resolve = r)),
		);
		render(<FeedbackPrompt />);
		act(() => feedbackStore.getState().open("menu"));

		await act(async () => resolve(true));

		expect(feedbackStore.getState().source).toBe("menu");
	});
});
