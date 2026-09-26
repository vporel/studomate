/**
 * @jest-environment jsdom
 */
import { renderWithI18n } from "@tests/utils/i18n";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import AuthModal from "./AuthModal";

const mockSignIn = jest.fn();
const mockSignInAnonymous = jest.fn();
const mockSignUp = jest.fn();
const mockSignUpAnonymous = jest.fn();
const mockSetAuthModalVisible = jest.fn();
const mockResetPassword = jest.fn();

jest.mock("@/ui/stores/auth/auth.store", () => ({
	useAuthStore: (selector: any) =>
		selector({
			ui: { authModalVisible: true, authModalPrompt: null },
			setAuthModalVisible: mockSetAuthModalVisible,
			signIn: mockSignIn,
			signInAnonymous: mockSignInAnonymous,
			signUp: mockSignUp,
			signUpAnonymous: mockSignUpAnonymous,
			resetPassword: mockResetPassword,
		}),
}));

jest.mock("@/ui/components/profile/UserProfileFields", () => ({
	__esModule: true,
	default: () => <div data-testid="profile-fields" />,
}));

const ok = { ok: true };

function setup() {
	renderWithI18n(<AuthModal />);
}

const type = (label: string, value: string) =>
	fireEvent.change(screen.getByLabelText(new RegExp(`^${label}`)), {
		target: { value },
	});

describe("AuthModal", () => {
	afterEach(() => jest.clearAllMocks());

	describe("connexion", () => {
		it("propose le pseudo par défaut, et l'email après changement de mode", () => {
			setup();

			expect(screen.getByLabelText(/^Pseudo/)).toBeInTheDocument();
			expect(screen.queryByLabelText(/^Email/)).not.toBeInTheDocument();

			fireEvent.click(screen.getByRole("button", { name: "Email" }));

			expect(screen.getByLabelText(/^Email/)).toBeInTheDocument();
			expect(screen.queryByLabelText(/^Pseudo/)).not.toBeInTheDocument();
		});

		it("vide le formulaire au changement de mode", () => {
			setup();
			type("Pseudo", "abc");
			type("Mot de passe", "secret");

			fireEvent.click(screen.getByRole("button", { name: "Email" }));

			expect(screen.getByLabelText(/^Mot de passe/)).toHaveValue("");
		});

		it("n'affiche « Mot de passe oublié ? » qu'en mode email", () => {
			setup();
			expect(
				screen.queryByText("Mot de passe oublié ?"),
			).not.toBeInTheDocument();

			fireEvent.click(screen.getByRole("button", { name: "Email" }));

			expect(screen.getByText("Mot de passe oublié ?")).toBeInTheDocument();
		});

		it("connecte en anonyme avec pseudo et mot de passe", async () => {
			mockSignInAnonymous.mockResolvedValue(ok);
			setup();
			type("Pseudo", "abc");
			type("Mot de passe", "secret");

			fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

			await waitFor(() =>
				expect(mockSignInAnonymous).toHaveBeenCalledWith("abc", "secret"),
			);
			expect(mockSetAuthModalVisible).toHaveBeenCalledWith(false);
		});

		it("connecte avec email et mot de passe", async () => {
			mockSignIn.mockResolvedValue(ok);
			setup();
			fireEvent.click(screen.getByRole("button", { name: "Email" }));
			type("Email", "a@b.fr");
			type("Mot de passe", "secret");

			fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

			await waitFor(() =>
				expect(mockSignIn).toHaveBeenCalledWith("a@b.fr", "secret"),
			);
		});

		it("affiche l'erreur et reste ouverte quand la connexion échoue", async () => {
			mockSignInAnonymous.mockResolvedValue({
				ok: false,
				code: "invalidPseudoCredentials",
			});
			setup();
			type("Pseudo", "abc");
			type("Mot de passe", "secret");

			fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

			await waitFor(() => expect(mockSignInAnonymous).toHaveBeenCalledTimes(1));
			expect(mockSetAuthModalVisible).not.toHaveBeenCalled();
			expect(
				await screen.findByText("Pseudo ou mot de passe incorrect."),
			).toBeInTheDocument();
		});
	});

	describe("création de compte", () => {
		const openSignUp = () =>
			fireEvent.click(screen.getByText("Pas de compte ? En créer un"));

		it("mode anonyme : affiche l'avertissement, l'aide du pseudo et le profil", () => {
			setup();
			openSignUp();

			expect(screen.getByText(/Aucune donnée personnelle/)).toBeInTheDocument();
			expect(
				screen.getByText("Votre identifiant public. Doit être unique."),
			).toBeInTheDocument();
			expect(screen.getByTestId("profile-fields")).toBeInTheDocument();
		});

		it("mode avec email : ni avertissement ni aide du pseudo", () => {
			setup();
			openSignUp();

			fireEvent.click(screen.getByRole("button", { name: "Avec email" }));

			expect(screen.getByLabelText(/^Email/)).toBeInTheDocument();
			expect(
				screen.queryByText(/Aucune donnée personnelle/),
			).not.toBeInTheDocument();
			expect(
				screen.queryByText("Votre identifiant public. Doit être unique."),
			).not.toBeInTheDocument();
		});

		it("crée un compte anonyme avec pseudo, mot de passe et profil", async () => {
			mockSignUpAnonymous.mockResolvedValue(ok);
			setup();
			openSignUp();
			type("Pseudo", "abc");
			type("Mot de passe", "secret");

			fireEvent.click(screen.getByRole("button", { name: "Créer le compte" }));

			await waitFor(() =>
				expect(mockSignUpAnonymous).toHaveBeenCalledWith(
					"abc",
					"secret",
					expect.anything(),
				),
			);
		});

		it("crée un compte avec email", async () => {
			mockSignUp.mockResolvedValue(ok);
			setup();
			openSignUp();
			fireEvent.click(screen.getByRole("button", { name: "Avec email" }));
			type("Email", "a@b.fr");
			type("Mot de passe", "secret");

			fireEvent.click(screen.getByRole("button", { name: "Créer le compte" }));

			await waitFor(() =>
				expect(mockSignUp).toHaveBeenCalledWith(
					"a@b.fr",
					"secret",
					expect.anything(),
				),
			);
		});
	});

	describe("mot de passe oublié", () => {
		const openResetScreen = () => {
			setup();
			fireEvent.click(screen.getByRole("button", { name: "Email" }));
			fireEvent.click(screen.getByText("Mot de passe oublié ?"));
		};

		it("affiche le champ email seul, sans mot de passe", () => {
			openResetScreen();

			expect(screen.getByLabelText(/^Email/)).toBeInTheDocument();
			expect(
				screen.queryByLabelText(/^Mot de passe(?! oublié)/),
			).not.toBeInTheDocument();
		});

		it("envoie le lien et confirme l'envoi", async () => {
			mockResetPassword.mockResolvedValue(ok);
			openResetScreen();
			type("Email", "a@b.fr");

			fireEvent.click(screen.getByRole("button", { name: "Envoyer le lien" }));

			await waitFor(() =>
				expect(mockResetPassword).toHaveBeenCalledWith("a@b.fr"),
			);
			expect(
				await screen.findByText(/email de réinitialisation a été envoyé/),
			).toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "Envoyer le lien" }),
			).not.toBeInTheDocument();
		});

		it("revient à la connexion", () => {
			openResetScreen();

			fireEvent.click(
				screen.getByRole("button", { name: "Retour à la connexion" }),
			);

			expect(screen.getByLabelText(/^Mot de passe/)).toBeInTheDocument();
		});
	});
});
