/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import Header from "./Header";

jest.mock("@/i18n/navigation", () => ({
	...jest.requireActual("@/i18n/navigation"),
	usePathname: () => "/training",
}));

let supabaseConfigured = false;
jest.mock("@/persistence/repositories/supabase-client", () => ({
	get isSupabaseConfigured() {
		return supabaseConfigured;
	},
	supabase: {},
}));

jest.mock("@/ui/stores/auth/auth.store", () => ({
	useAuthStore: (selector: any) =>
		selector({
			user: null,
			loading: false,
			ui: { authModalVisible: false, authModalPrompt: null },
			init: jest.fn(),
			signIn: jest.fn(),
			signUp: jest.fn(),
			signUpAnonymous: jest.fn(),
			signInAnonymous: jest.fn(),
			resetPassword: jest.fn(),
			signOut: jest.fn(),
			setAuthModalVisible: jest.fn(),
		}),
}));

describe("Header", () => {
	beforeEach(() => {
		supabaseConfigured = false;
	});

	it("affiche l'état de connexion (compte) quand le cloud est configuré", () => {
		supabaseConfigured = true;
		renderWithI18n(<Header />);
		expect(screen.getAllByText("Se connecter").length).toBeGreaterThan(0);
	});

	it("n'affiche pas l'état de connexion quand le cloud n'est pas configuré", () => {
		supabaseConfigured = false;
		renderWithI18n(<Header />);
		expect(screen.queryByText("Se connecter")).not.toBeInTheDocument();
	});

	it("expose un CTA vers l'application", () => {
		renderWithI18n(<Header />);
		const cta = screen
			.getAllByRole("link", { name: /ouvrir l'application/i })
			.find((el) => el.getAttribute("href") === "/app");
		expect(cta).toBeDefined();
	});

	it("le logo renvoie vers l'accueil, pas vers l'app", () => {
		renderWithI18n(<Header />);
		const logoLink = screen.getByRole("link", { name: /studomate/i });
		expect(logoLink).toHaveAttribute("href", "/");
	});

	it("ouvre un menu avec les liens de navigation sur mobile", () => {
		renderWithI18n(<Header />);
		fireEvent.click(screen.getByRole("button", { name: /menu/i }));
		expect(
			screen.getByRole("menuitem", { name: /manuel/i }),
		).toHaveAttribute("href", "/manuel-utilisateur");
	});

	it("marque le lien de la page courante comme actif (aria-current)", () => {
		renderWithI18n(<Header />);
		expect(
			screen.getByRole("link", { name: /formations/i }),
		).toHaveAttribute("aria-current", "page");
		expect(screen.getByRole("link", { name: /accueil/i })).not.toHaveAttribute(
			"aria-current",
		);
	});
});
