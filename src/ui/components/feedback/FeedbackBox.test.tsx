/**
 * @jest-environment jsdom
 */
import { feedbackStore } from "@/ui/stores/feedback/feedback.store";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import FeedbackBox from "./FeedbackBox";

const mockSendFeedback = jest.fn();
jest.mock("@/ui/services/send-feedback", () => ({
	__esModule: true,
	default: (...args: unknown[]) => mockSendFeedback(...args),
}));

const mockComplete = jest.fn();
const mockPostpone = jest.fn();
jest.mock("@/ui/services/feedback-prompt", () => ({
	completeFeedbackPrompt: () => mockComplete(),
	postponeFeedbackPrompt: () => mockPostpone(),
}));

const mockTrackEvent = jest.fn();
jest.mock("@/ui/services/analytics", () => ({
	__esModule: true,
	default: (...args: unknown[]) => mockTrackEvent(...args),
}));

const mockToast = { success: jest.fn(), error: jest.fn() };
jest.mock("react-toastify", () => ({
	toast: {
		success: (...a: unknown[]) => mockToast.success(...a),
		error: (...a: unknown[]) => mockToast.error(...a),
	},
}));

const open = (source: "prompt" | "menu") =>
	act(() => feedbackStore.getState().open(source));

describe("FeedbackBox", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		act(() => feedbackStore.getState().close());
	});

	it("renders nothing while closed", () => {
		renderWithI18n(<FeedbackBox />);
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("has no close cross: only 'Plus tard' and 'Envoyer' when the app asks", () => {
		renderWithI18n(<FeedbackBox />);
		open("prompt");

		expect(screen.getByRole("dialog")).toBeTruthy();
		expect(screen.getByRole("button", { name: "Plus tard" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "Envoyer" })).toBeTruthy();
		expect(screen.queryByRole("button", { name: /fermer|close/i })).toBeNull();
	});

	it("cannot send before a rating is chosen", () => {
		renderWithI18n(<FeedbackBox />);
		open("prompt");

		expect(
			(screen.getByRole("button", { name: "Envoyer" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
	});

	it("'Plus tard' postpones the prompt", () => {
		renderWithI18n(<FeedbackBox />);
		open("prompt");

		fireEvent.click(screen.getByRole("button", { name: "Plus tard" }));

		expect(mockPostpone).toHaveBeenCalledTimes(1);
	});

	it("opened from the menu, offers 'Annuler' which closes without postponing", () => {
		renderWithI18n(<FeedbackBox />);
		open("menu");

		expect(screen.queryByRole("button", { name: "Plus tard" })).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

		expect(mockPostpone).not.toHaveBeenCalled();
		expect(feedbackStore.getState().source).toBeNull();
	});

	it("sends the rating and the comment, then completes the prompt", async () => {
		mockSendFeedback.mockResolvedValue(true);
		renderWithI18n(<FeedbackBox />);
		open("prompt");

		fireEvent.click(screen.getByLabelText("4 étoiles sur 5"));
		fireEvent.change(screen.getByLabelText("Commentaire (facultatif)"), {
			target: { value: "Très bien" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

		await waitFor(() => expect(mockComplete).toHaveBeenCalledTimes(1));
		expect(mockSendFeedback).toHaveBeenCalledWith({
			rating: 4,
			comment: "Très bien",
			locale: "fr",
		});
		expect(mockTrackEvent).toHaveBeenCalledWith("feedback-sent", {
			rating: 4,
			source: "prompt",
		});
		expect(mockToast.success).toHaveBeenCalledWith("Merci pour votre avis !");
	});

	it("shows a spinner on the button while sending", async () => {
		let resolve!: (sent: boolean) => void;
		mockSendFeedback.mockReturnValue(
			new Promise<boolean>((r) => (resolve = r)),
		);
		renderWithI18n(<FeedbackBox />);
		open("prompt");
		fireEvent.click(screen.getByLabelText("3 étoiles sur 5"));
		expect(screen.queryByRole("progressbar")).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

		expect(await screen.findByRole("progressbar")).toBeTruthy();
		expect(screen.getByRole("button", { name: "Envoi…" })).toBeTruthy();

		await act(async () => resolve(true));
		expect(screen.queryByRole("progressbar")).toBeNull();
	});

	it("keeps the box and the typed text when sending fails", async () => {
		mockSendFeedback.mockResolvedValue(false);
		renderWithI18n(<FeedbackBox />);
		open("prompt");

		fireEvent.click(screen.getByLabelText("2 étoiles sur 5"));
		fireEvent.change(screen.getByLabelText("Commentaire (facultatif)"), {
			target: { value: "Bof" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

		await waitFor(() => expect(mockToast.error).toHaveBeenCalledTimes(1));
		expect(mockComplete).not.toHaveBeenCalled();
		expect(
			(screen.getByLabelText("Commentaire (facultatif)") as HTMLTextAreaElement)
				.value,
		).toBe("Bof");
	});

	it("sends the English locale when the interface is in English", async () => {
		mockSendFeedback.mockResolvedValue(true);
		renderWithI18n(<FeedbackBox />, { locale: "en" });
		open("menu");

		fireEvent.click(screen.getByLabelText("5 stars out of 5"));
		fireEvent.click(screen.getByRole("button", { name: "Send" }));

		await waitFor(() => expect(mockSendFeedback).toHaveBeenCalled());
		expect(mockSendFeedback).toHaveBeenCalledWith(
			expect.objectContaining({ locale: "en" }),
		);
	});
});
