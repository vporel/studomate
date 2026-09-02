import { supabase } from "@/persistence/repositories/supabase-client";
import { User } from "@supabase/supabase-js";
import { createStore, useStore } from "zustand";

/**
 * Codes d'erreur d'authentification — le store (couche non-UI) ne produit pas de texte :
 * le message lisible vit dans `src/i18n/messages/{fr,en}/auth.json` sous `auth.errors.<code>`
 * et le rendu se fait dans `AuthModal`.
 */
export type AuthErrorCode =
	| "invalidCredentials"
	| "invalidPseudoCredentials"
	| "emailAlreadyExists"
	| "pseudoTaken"
	| "emailNotConfirmed"
	| "rateLimit"
	| "weakPassword"
	| "invalidEmail"
	| "network"
	| "signInFailed"
	| "signUpFailed";

export type AuthResult = { ok: true } | { ok: false; code: AuthErrorCode };

export const ANONYMOUS_EMAIL_DOMAIN = "user.studomate.com";

export function isAnonymousUser(user: User | null): boolean {
	return user?.email?.endsWith(`@${ANONYMOUS_EMAIL_DOMAIN}`) ?? false;
}

export function getAnonymousPseudo(user: User): string {
	return user.email?.replace(`@${ANONYMOUS_EMAIL_DOMAIN}`, "") ?? "";
}

function buildAnonymousEmail(pseudo: string): string {
	return `${pseudo}@${ANONYMOUS_EMAIL_DOMAIN}`;
}

export type AuthStoreState = {
	user: User | null;
	loading: boolean;
	ui: {
		authModalVisible: boolean;
		/** Phrase de contexte affichée en tête de la modale (ex. « Connectez-vous pour partager »). */
		authModalPrompt: string | null;
	};
	init: () => Promise<void>;
	signUp: (email: string, password: string) => Promise<AuthResult>;
	signUpAnonymous: (pseudo: string, password: string) => Promise<AuthResult>;
	signIn: (email: string, password: string) => Promise<AuthResult>;
	signInAnonymous: (pseudo: string, password: string) => Promise<AuthResult>;
	resetPassword: (email: string) => Promise<AuthResult>;
	signOut: () => Promise<void>;
	setAuthModalVisible: (visible: boolean, prompt?: string) => void;
};

/**
 * `init()` peut être appelé depuis plusieurs composants montés simultanément (barre de titre,
 * écran de démarrage) : ce garde évite de s'abonner plusieurs fois à `onAuthStateChange`.
 */
let initPromise: Promise<void> | null = null;

function toAuthErrorCode(
	error: { code?: string; message?: string },
	mode: "signIn" | "signUp",
): AuthErrorCode {
	const code = error.code ?? "";
	const message = (error.message ?? "").toLowerCase();

	if (code === "invalid_credentials" || message.includes("invalid login credentials"))
		return "invalidCredentials";
	if (code === "user_already_exists" || message.includes("already registered"))
		return "emailAlreadyExists";
	if (code === "email_not_confirmed" || message.includes("email not confirmed"))
		return "emailNotConfirmed";
	if (code === "over_email_send_rate_limit" || message.includes("rate limit"))
		return "rateLimit";
	if (code === "weak_password" || message.includes("weak password"))
		return "weakPassword";
	if (code === "invalid_email" || message.includes("invalid email"))
		return "invalidEmail";
	if (message.includes("fetch") || message.includes("network")) return "network";
	return mode === "signIn" ? "signInFailed" : "signUpFailed";
}

function isAlreadyRegistered(error: { code?: string; message?: string }): boolean {
	return (
		error.code === "user_already_exists" ||
		(error.message ?? "").toLowerCase().includes("already registered")
	);
}

function isInvalidCredentials(error: { code?: string; message?: string }): boolean {
	return (
		error.code === "invalid_credentials" ||
		(error.message ?? "").toLowerCase().includes("invalid login credentials")
	);
}

export const authStore = createStore<AuthStoreState>((set) => ({
	user: null,
	loading: true,
	ui: {
		authModalVisible: false,
		authModalPrompt: null,
	},

	init: async () => {
		if (!initPromise) {
			initPromise = (async () => {
				const {
					data: { session },
				} = await supabase.auth.getSession();
				set({ user: session?.user ?? null, loading: false });
				supabase.auth.onAuthStateChange((_event, session) => {
					set({ user: session?.user ?? null });
				});
			})();
		}
		await initPromise;
	},

	signUp: async (email, password) => {
		const { data, error } = await supabase.auth.signUp({ email, password });
		if (error)
			return { ok: false, code: toAuthErrorCode(error, "signUp") };
		set({ user: data.user });
		return { ok: true };
	},

	signUpAnonymous: async (pseudo, password) => {
		const email = buildAnonymousEmail(pseudo);
		const { data, error } = await supabase.auth.signUp({ email, password });
		if (error) {
			const code: AuthErrorCode = isAlreadyRegistered(error)
				? "pseudoTaken"
				: toAuthErrorCode(error, "signUp");
			return { ok: false, code };
		}
		set({ user: data.user });
		return { ok: true };
	},

	signIn: async (email, password) => {
		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});
		if (error)
			return { ok: false, code: toAuthErrorCode(error, "signIn") };
		set({ user: data.user });
		return { ok: true };
	},

	signInAnonymous: async (pseudo, password) => {
		const email = buildAnonymousEmail(pseudo);
		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});
		if (error) {
			const code: AuthErrorCode = isInvalidCredentials(error)
				? "invalidPseudoCredentials"
				: toAuthErrorCode(error, "signIn");
			return { ok: false, code };
		}
		set({ user: data.user });
		return { ok: true };
	},

	resetPassword: async (email) => {
		const { error } = await supabase.auth.resetPasswordForEmail(email);
		if (error)
			return { ok: false, code: toAuthErrorCode(error, "signIn") };
		return { ok: true };
	},

	signOut: async () => {
		await supabase.auth.signOut();
		set({ user: null });
	},

	setAuthModalVisible: (visible, prompt) =>
		set((state) => ({
			ui: {
				...state.ui,
				authModalVisible: visible,
				authModalPrompt: visible ? (prompt ?? null) : null,
			},
		})),
}));

export function useAuthStore<T>(selector: (state: AuthStoreState) => T) {
	return useStore(authStore, selector);
}
