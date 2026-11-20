/** @jest-environment jsdom */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import AccountStatus from "./AccountStatus";

const mockInit = jest.fn();
const mockSetAuthModalVisible = jest.fn();
let mockUser: { email?: string } | null = null;

jest.mock("@/persistence/repositories/supabase-client", () => ({
	isSupabaseConfigured: true,
}));
jest.mock("@/ui/stores/auth/auth.store", () => ({
	useAuthStore: (selector: (state: object) => unknown) =>
		selectorImplementation({
			user: mockUser,
			loading: false,
			init: mockInit,
			setAuthModalVisible: mockSetAuthModalVisible,
		})(selector),
	isAnonymousUser: () => false,
	getAnonymousPseudo: () => "",
}));
jest.mock("./AuthModal", () => ({ __esModule: true, default: () => null }));
jest.mock("./CloudAccountModal", () => ({
	__esModule: true,
	default: () => null,
}));

const startIcon = (button: HTMLElement) =>
	button.querySelector(
		'.MuiButton-startIcon [data-testid="AccountCircleIcon"]',
	);

describe("AccountStatus", () => {
	beforeEach(() => {
		mockUser = null;
		mockSetAuthModalVisible.mockClear();
	});

	it("signed out: shows a sign-in button with the account icon before the label", () => {
		renderWithI18n(<AccountStatus />);

		const button = screen.getByText("Se connecter").closest("button")!;

		expect(startIcon(button)).not.toBeNull();
		expect(button.querySelector(".MuiButton-endIcon")).toBeNull();
	});

	it("signed out: the button opens the sign-in window", () => {
		renderWithI18n(<AccountStatus />);

		fireEvent.click(screen.getByText("Se connecter").closest("button")!);

		expect(mockSetAuthModalVisible).toHaveBeenCalledWith(true);
	});

	it("signed in: shows the account name with the same icon, before it", () => {
		mockUser = { email: "ada@example.com" };
		renderWithI18n(<AccountStatus />);

		const button = screen.getByRole("button", { name: "ada@example.com" });

		expect(startIcon(button)).not.toBeNull();
		expect(button.querySelector(".MuiButton-endIcon")).toBeNull();
	});
});
