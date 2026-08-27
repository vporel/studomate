import {
	ANONYMOUS_EMAIL_DOMAIN,
	getAnonymousPseudo,
	isAnonymousUser,
} from "./auth.store";
import type { User } from "@supabase/supabase-js";

const mockSignUp = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn((..._args: any[]) => ({
	data: { subscription: { unsubscribe: jest.fn() } },
}));
const mockResetPasswordForEmail = jest.fn();

jest.mock("@/persistence/repositories/supabase-client", () => ({
	supabase: {
		auth: {
			getSession: (...args: any[]) => mockGetSession(...args),
			onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
			signUp: (...args: any[]) => mockSignUp(...args),
			signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
			signOut: (...args: any[]) => mockSignOut(...args),
			resetPasswordForEmail: (...args: any[]) =>
				mockResetPasswordForEmail(...args),
		},
	},
}));

// Import après le mock
import { authStore } from "./auth.store";

function makeUser(email: string): User {
	return {
		id: "u1",
		email,
		app_metadata: {},
		user_metadata: {},
		aud: "authenticated",
		created_at: "",
	} as User;
}

describe("isAnonymousUser", () => {
	it("retourne true pour une adresse sur le domaine anonyme", () => {
		expect(isAnonymousUser(makeUser(`pierre@${ANONYMOUS_EMAIL_DOMAIN}`))).toBe(
			true,
		);
	});

	it("retourne false pour une adresse email réelle", () => {
		expect(isAnonymousUser(makeUser("alice@gmail.com"))).toBe(false);
	});

	it("retourne false pour null", () => {
		expect(isAnonymousUser(null)).toBe(false);
	});
});

describe("getAnonymousPseudo", () => {
	it("extrait le pseudo depuis l'adresse factice", () => {
		expect(
			getAnonymousPseudo(makeUser(`pierre@${ANONYMOUS_EMAIL_DOMAIN}`)),
		).toBe("pierre");
	});

	it("retourne une chaîne vide si l'email est absent", () => {
		const user = makeUser("x");
		(user as any).email = undefined;
		expect(getAnonymousPseudo(user)).toBe("");
	});
});

describe("authStore", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGetSession.mockResolvedValue({ data: { session: null } });
	});

	describe("signUp", () => {
		it("retourne ok:true et pose l'utilisateur si Supabase réussit", async () => {
			const user = makeUser("alice@example.com");
			mockSignUp.mockResolvedValue({ data: { user }, error: null });

			const result = await authStore
				.getState()
				.signUp("alice@example.com", "password");

			expect(result.ok).toBe(true);
			expect(authStore.getState().user?.email).toBe("alice@example.com");
		});

		it("retourne un message français pour 'already registered'", async () => {
			mockSignUp.mockResolvedValue({
				data: {},
				error: {
					code: "user_already_exists",
					message: "User already registered",
				},
			});

			const result = await authStore.getState().signUp("x@x.com", "p");

			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.message).toMatch(/existe déjà/i);
		});

		it("retourne un message français pour un mot de passe faible", async () => {
			mockSignUp.mockResolvedValue({
				data: {},
				error: {
					code: "weak_password",
					message: "Password should be at least 6 characters",
				},
			});

			const result = await authStore.getState().signUp("x@x.com", "a");

			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.message).toMatch(/trop faible/i);
		});

		it("retourne un message générique pour une erreur inconnue", async () => {
			mockSignUp.mockResolvedValue({
				data: {},
				error: { code: "unknown_error", message: "Something went wrong" },
			});

			const result = await authStore.getState().signUp("x@x.com", "p");

			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.message).toBeTruthy();
		});
	});

	describe("signIn", () => {
		it("retourne ok:true et pose l'utilisateur si Supabase réussit", async () => {
			const user = makeUser("alice@example.com");
			mockSignInWithPassword.mockResolvedValue({ data: { user }, error: null });

			const result = await authStore
				.getState()
				.signIn("alice@example.com", "password");

			expect(result.ok).toBe(true);
			expect(authStore.getState().user?.email).toBe("alice@example.com");
		});

		it("retourne un message français pour 'invalid credentials'", async () => {
			mockSignInWithPassword.mockResolvedValue({
				data: {},
				error: {
					code: "invalid_credentials",
					message: "Invalid login credentials",
				},
			});

			const result = await authStore.getState().signIn("x@x.com", "wrong");

			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.message).toMatch(/incorrect/i);
		});
	});

	describe("signUpAnonymous", () => {
		it("construit l'adresse factice et crée le compte", async () => {
			const user = makeUser(`pierre@${ANONYMOUS_EMAIL_DOMAIN}`);
			mockSignUp.mockResolvedValue({ data: { user }, error: null });

			const result = await authStore
				.getState()
				.signUpAnonymous("pierre", "mdp");

			expect(result.ok).toBe(true);
			expect(mockSignUp).toHaveBeenCalledWith(
				expect.objectContaining({ email: `pierre@${ANONYMOUS_EMAIL_DOMAIN}` }),
			);
		});

		it("retourne un message spécifique si le pseudo est déjà utilisé", async () => {
			mockSignUp.mockResolvedValue({
				data: {},
				error: {
					code: "user_already_exists",
					message: "User already registered",
				},
			});

			const result = await authStore
				.getState()
				.signUpAnonymous("pierre", "mdp");

			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.message).toMatch(/pseudo.*déjà utilisé/i);
		});
	});

	describe("signInAnonymous", () => {
		it("construit l'adresse factice et connecte l'utilisateur", async () => {
			const user = makeUser(`pierre@${ANONYMOUS_EMAIL_DOMAIN}`);
			mockSignInWithPassword.mockResolvedValue({ data: { user }, error: null });

			const result = await authStore
				.getState()
				.signInAnonymous("pierre", "mdp");

			expect(result.ok).toBe(true);
			expect(mockSignInWithPassword).toHaveBeenCalledWith(
				expect.objectContaining({ email: `pierre@${ANONYMOUS_EMAIL_DOMAIN}` }),
			);
		});

		it("retourne un message spécifique pour pseudo/mdp incorrect", async () => {
			mockSignInWithPassword.mockResolvedValue({
				data: {},
				error: {
					code: "invalid_credentials",
					message: "Invalid login credentials",
				},
			});

			const result = await authStore
				.getState()
				.signInAnonymous("pierre", "mauvais");

			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.message).toMatch(/pseudo.*incorrect/i);
		});
	});

	describe("resetPassword", () => {
		it("retourne ok:true si Supabase réussit", async () => {
			mockResetPasswordForEmail.mockResolvedValue({ error: null });

			const result = await authStore
				.getState()
				.resetPassword("alice@example.com");

			expect(result.ok).toBe(true);
		});

		it("retourne ok:false avec message français si Supabase échoue", async () => {
			mockResetPasswordForEmail.mockResolvedValue({
				error: { code: "", message: "rate limit exceeded" },
			});

			const result = await authStore
				.getState()
				.resetPassword("alice@example.com");

			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.message).toMatch(/tentatives/i);
		});
	});

	describe("signOut", () => {
		it("efface l'utilisateur du store", async () => {
			authStore.setState({ user: makeUser("alice@example.com") });
			mockSignOut.mockResolvedValue({});

			await authStore.getState().signOut();

			expect(authStore.getState().user).toBeNull();
		});
	});
});
