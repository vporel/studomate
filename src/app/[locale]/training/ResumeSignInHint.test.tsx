/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import ResumeSignInHint from "./ResumeSignInHint";

let supabaseConfigured = false;
jest.mock("@/persistence/repositories/supabase-client", () => ({
	get isSupabaseConfigured() {
		return supabaseConfigured;
	},
	supabase: {},
}));

let mockUser: { id: string } | null = null;
let mockLoading = false;
const mockInit = jest.fn();
const mockSetAuthModalVisible = jest.fn();
jest.mock("@/ui/stores/auth/auth.store", () => ({
	useAuthStore: (selector: any) =>
		selector({
			user: mockUser,
			loading: mockLoading,
			init: mockInit,
			setAuthModalVisible: mockSetAuthModalVisible,
		}),
}));

function setup() {
	return renderWithI18n(
		<ResumeSignInHint
			hint="Connectez-vous pour reprendre où vous en étiez."
			cta="Se connecter"
			savedHint="Votre progression est sauvegardée."
		/>,
	);
}

describe("ResumeSignInHint", () => {
	beforeEach(() => {
		supabaseConfigured = false;
		mockUser = null;
		mockLoading = false;
		mockSetAuthModalVisible.mockReset();
	});

	it("n'affiche rien quand le cloud n'est pas configuré", () => {
		supabaseConfigured = false;
		const { container } = setup();
		expect(container).toBeEmptyDOMElement();
	});

	it("n'affiche rien pendant le chargement de l'état de connexion", () => {
		supabaseConfigured = true;
		mockLoading = true;
		const { container } = setup();
		expect(container).toBeEmptyDOMElement();
	});

	it("invite un visiteur non connecté à se connecter", () => {
		supabaseConfigured = true;
		mockUser = null;
		setup();

		expect(
			screen.getByText("Connectez-vous pour reprendre où vous en étiez."),
		).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));
		expect(mockSetAuthModalVisible).toHaveBeenCalledWith(
			true,
			"Connectez-vous pour reprendre où vous en étiez.",
		);
	});

	it("confirme la sauvegarde pour un utilisateur connecté, sans bouton de connexion", () => {
		supabaseConfigured = true;
		mockUser = { id: "u1" };
		setup();

		expect(
			screen.getByText("Votre progression est sauvegardée."),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Se connecter" }),
		).not.toBeInTheDocument();
	});
});
