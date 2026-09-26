import {
	ANONYMOUS_EMAIL_DOMAIN,
	getAnonymousPseudo,
	isAnonymousUser,
} from "./auth.store";
import type { User } from "@supabase/supabase-js";
import { SchoolType } from "@/user-profile/SchoolType.enum";
import { UserType } from "@/user-profile/UserType.enum";

const mockSignUp = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn((..._args: any[]) => ({
	data: { subscription: { unsubscribe: jest.fn() } },
}));
const mockResetPasswordForEmail = jest.fn();
const mockRpc = jest.fn();
const mockMoveAllCloudToLocal = jest.fn();
const mockTrackEvent = jest.fn();

jest.mock("@/ui/lib/analytics", () => ({
	__esModule: true,
	default: (...args: any[]) => mockTrackEvent(...args),
}));

const mockSaveProfile = jest.fn();
const mockSetStoredProfile = jest.fn();

jest.mock("@/persistence/repositories/profile.repository", () => ({
	__esModule: true,
	default: class {
		save = (...args: any[]) => mockSaveProfile(...args);
	},
}));

jest.mock("@/ui/lib/user-profile-storage", () => ({
	setStoredUserProfile: (...args: any[]) => mockSetStoredProfile(...args),
}));

jest.mock("@/persistence/repositories/hybrid.project.repository", () => ({
	__esModule: true,
	default: class {
		moveAllCloudToLocal = (...args: any[]) => mockMoveAllCloudToLocal(...args);
	},
}));

jest.mock("@/persistence/repositories/supabase-client", () => ({
	supabase: {
		rpc: (...args: any[]) => mockRpc(...args),
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
		mockSaveProfile.mockResolvedValue(undefined);
	});

	describe("signUp", () => {
		it("saves the profile locally and in the cloud after sign-up", async () => {
			const user = makeUser("alice@example.com");
			mockSignUp.mockResolvedValue({ data: { user }, error: null });
			const profile = {
				userType: UserType.STUDENT,
				schoolType: SchoolType.BTS,
			};

			await authStore.getState().signUp("alice@example.com", "password", profile);

			expect(mockSetStoredProfile).toHaveBeenCalledWith(profile);
			expect(mockSaveProfile).toHaveBeenCalledWith(profile);
		});

		it("saves an empty profile when none is given", async () => {
			const user = makeUser("alice@example.com");
			mockSignUp.mockResolvedValue({ data: { user }, error: null });

			await authStore.getState().signUp("alice@example.com", "password");

			expect(mockSaveProfile).toHaveBeenCalledWith({
				userType: null,
				schoolType: null,
			});
		});

		it("still succeeds when saving the profile in the cloud fails", async () => {
			const user = makeUser("alice@example.com");
			mockSignUp.mockResolvedValue({ data: { user }, error: null });
			mockSaveProfile.mockRejectedValue(new Error("network"));

			const result = await authStore
				.getState()
				.signUp("alice@example.com", "password", {
					userType: UserType.TEACHER,
					schoolType: null,
				});

			expect(result.ok).toBe(true);
		});

		it("does not save the profile when sign-up fails", async () => {
			mockSignUp.mockResolvedValue({
				data: {},
				error: { code: "weak_password", message: "weak" },
			});

			await authStore.getState().signUp("x@x.com", "a", {
				userType: UserType.TEACHER,
				schoolType: null,
			});

			expect(mockSetStoredProfile).not.toHaveBeenCalled();
			expect(mockSaveProfile).not.toHaveBeenCalled();
		});

		it("retourne ok:true et pose l'utilisateur si Supabase réussit", async () => {
			const user = makeUser("alice@example.com");
			mockSignUp.mockResolvedValue({ data: { user }, error: null });

			const result = await authStore
				.getState()
				.signUp("alice@example.com", "password");

			expect(result.ok).toBe(true);
			expect(authStore.getState().user?.email).toBe("alice@example.com");
			expect(mockTrackEvent).toHaveBeenCalledWith("account-created", {
				anonymous: false,
			});
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
			if (!result.ok) expect(result.code).toBe("emailAlreadyExists");
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
			if (!result.ok) expect(result.code).toBe("weakPassword");
		});

		it("retourne un message générique pour une erreur inconnue", async () => {
			mockSignUp.mockResolvedValue({
				data: {},
				error: { code: "unknown_error", message: "Something went wrong" },
			});

			const result = await authStore.getState().signUp("x@x.com", "p");

			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.code).toBeTruthy();
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
			if (!result.ok) expect(result.code).toBe("invalidCredentials");
		});
	});

	describe("signUpAnonymous", () => {
		it("saves the profile after an anonymous sign-up", async () => {
			const user = makeUser(`pierre@${ANONYMOUS_EMAIL_DOMAIN}`);
			mockSignUp.mockResolvedValue({ data: { user }, error: null });
			const profile = {
				userType: UserType.PROFESSIONAL,
				schoolType: null,
			};

			await authStore.getState().signUpAnonymous("pierre", "mdp", profile);

			expect(mockSetStoredProfile).toHaveBeenCalledWith(profile);
			expect(mockSaveProfile).toHaveBeenCalledWith(profile);
		});

		it("does not save the profile when the pseudo is taken", async () => {
			mockSignUp.mockResolvedValue({
				data: {},
				error: { code: "user_already_exists", message: "already registered" },
			});

			await authStore.getState().signUpAnonymous("pierre", "mdp", {
				userType: UserType.TEACHER,
				schoolType: null,
			});

			expect(mockSaveProfile).not.toHaveBeenCalled();
		});

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
			expect(mockTrackEvent).toHaveBeenCalledWith("account-created", {
				anonymous: true,
			});
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
			if (!result.ok) expect(result.code).toBe("pseudoTaken");
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
			if (!result.ok) expect(result.code).toBe("invalidPseudoCredentials");
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
			if (!result.ok) expect(result.code).toBe("rateLimit");
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
	describe("deleteAccount", () => {
		beforeEach(() => {
			authStore.setState({ user: makeUser("alice@example.com") });
			mockSignInWithPassword.mockResolvedValue({ data: {}, error: null });
			mockMoveAllCloudToLocal.mockResolvedValue({ ok: true });
			mockRpc.mockResolvedValue({ error: null });
			mockSignOut.mockResolvedValue({ error: null });
		});

		it("re-authenticates, moves the cloud projects to local, deletes the account and signs out", async () => {
			const calls: string[] = [];
			mockSignInWithPassword.mockImplementation(async () => {
				calls.push("reauth");
				return { data: {}, error: null };
			});
			mockMoveAllCloudToLocal.mockImplementation(async () => {
				calls.push("repatriate");
				return { ok: true };
			});
			mockRpc.mockImplementation(async () => {
				calls.push("rpc");
				return { error: null };
			});

			const result = await authStore.getState().deleteAccount("secret");

			expect(result).toEqual({ ok: true });
			expect(calls).toEqual(["reauth", "repatriate", "rpc"]);
			expect(mockSignInWithPassword).toHaveBeenCalledWith({
				email: "alice@example.com",
				password: "secret",
			});
			expect(mockRpc).toHaveBeenCalledWith("delete_my_account");
			expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
			expect(authStore.getState().user).toBeNull();
			expect(mockTrackEvent).toHaveBeenCalledWith("account-deleted");
		});

		it("returns wrongPassword and touches nothing when the password is wrong", async () => {
			mockSignInWithPassword.mockResolvedValue({
				data: {},
				error: { code: "invalid_credentials", message: "Invalid login credentials" },
			});

			const result = await authStore.getState().deleteAccount("nope");

			expect(result).toEqual({ ok: false, code: "wrongPassword" });
			expect(mockMoveAllCloudToLocal).not.toHaveBeenCalled();
			expect(mockRpc).not.toHaveBeenCalled();
			expect(authStore.getState().user).not.toBeNull();
		});

		it("returns a network error when the re-authentication cannot reach the server", async () => {
			mockSignInWithPassword.mockResolvedValue({
				data: {},
				error: { message: "Failed to fetch" },
			});

			const result = await authStore.getState().deleteAccount("secret");

			expect(result).toEqual({ ok: false, code: "network" });
			expect(mockRpc).not.toHaveBeenCalled();
		});

		it("does not delete the account when the repatriation fails", async () => {
			mockMoveAllCloudToLocal.mockResolvedValue({ ok: false, reason: "quota-exceeded" });

			const result = await authStore.getState().deleteAccount("secret");

			expect(result).toEqual({ ok: false, code: "repatriationFailed" });
			expect(mockRpc).not.toHaveBeenCalled();
			expect(authStore.getState().user).not.toBeNull();
		});

		it("keeps the user signed in when the server-side deletion fails", async () => {
			mockRpc.mockResolvedValue({ error: { message: "boom" } });

			const result = await authStore.getState().deleteAccount("secret");

			expect(result).toEqual({ ok: false, code: "deleteAccountFailed" });
			expect(mockSignOut).not.toHaveBeenCalled();
			expect(authStore.getState().user).not.toBeNull();
		});

		it("fails without calling the server when nobody is signed in", async () => {
			authStore.setState({ user: null });

			const result = await authStore.getState().deleteAccount("secret");

			expect(result).toEqual({ ok: false, code: "deleteAccountFailed" });
			expect(mockSignInWithPassword).not.toHaveBeenCalled();
		});
	});
});
