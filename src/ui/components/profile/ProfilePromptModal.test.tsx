/** @jest-environment jsdom */
import { renderWithI18n } from "@tests/utils/i18n";
import { fireEvent, screen } from "@testing-library/react";
import ProfilePromptModal from "./ProfilePromptModal";

const mockShouldAsk = jest.fn();
const mockSetStored = jest.fn();
const mockTrackEvent = jest.fn();

jest.mock("@/ui/lib/user-profile-storage", () => ({
	shouldAskUserProfile: () => mockShouldAsk(),
	setStoredUserProfile: (...args: any[]) => mockSetStored(...args),
}));

jest.mock("@/ui/lib/analytics", () => ({
	__esModule: true,
	default: (...args: any[]) => mockTrackEvent(...args),
}));

describe("ProfilePromptModal", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockShouldAsk.mockReturnValue(true);
	});

	it("renders nothing when the question must not be asked", () => {
		mockShouldAsk.mockReturnValue(false);
		renderWithI18n(<ProfilePromptModal />);
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("stores the profile and closes right away for a non-student", () => {
		renderWithI18n(<ProfilePromptModal />);

		fireEvent.click(screen.getByRole("button", { name: "Enseignant / formateur" }));

		expect(mockSetStored).toHaveBeenCalledWith({
			userType: "teacher",
			schoolType: null,
		});
		expect(mockTrackEvent).toHaveBeenCalledWith("profile", {
			userType: "teacher",
		});
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("asks for the school type after choosing student, without storing yet", () => {
		renderWithI18n(<ProfilePromptModal />);

		fireEvent.click(screen.getByRole("button", { name: "Étudiant" }));

		expect(screen.getByText("Une dernière question")).toBeInTheDocument();
		expect(mockSetStored).not.toHaveBeenCalled();
	});

	it("stores the student with the chosen school type", () => {
		renderWithI18n(<ProfilePromptModal />);

		fireEvent.click(screen.getByRole("button", { name: "Étudiant" }));
		fireEvent.click(screen.getByRole("button", { name: "IUT / BUT" }));

		expect(mockSetStored).toHaveBeenCalledWith({
			userType: "student",
			schoolType: "iut",
		});
		expect(mockTrackEvent).toHaveBeenCalledWith("profile", {
			userType: "student",
			schoolType: "iut",
		});
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("stores an empty profile without tracking when skipped on the first question", () => {
		renderWithI18n(<ProfilePromptModal />);

		fireEvent.click(screen.getByRole("button", { name: "Passer" }));

		expect(mockSetStored).toHaveBeenCalledWith({
			userType: null,
			schoolType: null,
		});
		expect(mockTrackEvent).not.toHaveBeenCalled();
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("treats the close button as skipping", () => {
		renderWithI18n(<ProfilePromptModal />);

		fireEvent.click(screen.getByRole("button", { name: "Fermer" }));

		expect(mockSetStored).toHaveBeenCalledWith({
			userType: null,
			schoolType: null,
		});
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("treats Escape as skipping", () => {
		renderWithI18n(<ProfilePromptModal />);

		fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

		expect(mockSetStored).toHaveBeenCalledWith({
			userType: null,
			schoolType: null,
		});
	});

	it("keeps the student answer when the school question is skipped", () => {
		renderWithI18n(<ProfilePromptModal />);

		fireEvent.click(screen.getByRole("button", { name: "Étudiant" }));
		fireEvent.click(screen.getByRole("button", { name: "Passer" }));

		expect(mockSetStored).toHaveBeenCalledWith({
			userType: "student",
			schoolType: null,
		});
		expect(mockTrackEvent).toHaveBeenCalledWith("profile", {
			userType: "student",
		});
	});
});
