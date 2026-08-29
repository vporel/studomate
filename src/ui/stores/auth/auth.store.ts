import { supabase } from "@/persistence/repositories/supabase-client";
import { User } from "@supabase/supabase-js";
import { createStore, useStore } from "zustand";

export type AuthResult = { ok: true } | { ok: false; message: string };

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

function toFrenchAuthMessage(
	error: { code?: string; message?: string },
	mode: "signIn" | "signUp",
): string {
	const code = error.code ?? "";
	const message = error.message ?? "";

	if (
		code === "invalid_credentials" ||
		message.toLowerCase().includes("invalid login credentials")
	) {
		return "Email ou mot de passe incorrect.";
	}
	if (
		code === "user_already_exists" ||
		message.toLowerCase().includes("already registered")
	) {
		return "Un compte existe déjà avec cette adresse email.";
	}
	if (
		code === "email_not_confirmed" ||
		message.toLowerCase().includes("email not confirmed")
	) {
		return "Votre adresse email n'a pas encore été confirmée. Vérifiez votre boîte mail.";
	}
	if (
		code === "over_email_send_rate_limit" ||
		message.toLowerCase().includes("rate limit")
	) {
		return "Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.";
	}
	if (
		code === "weak_password" ||
		message.toLowerCase().includes("weak password")
	) {
		return "Mot de passe trop faible. Utilisez au moins 8 caractères.";
	}
	if (
		code === "invalid_email" ||
		message.toLowerCase().includes("invalid email")
	) {
		return "Adresse email invalide.";
	}
	if (
		message.toLowerCase().includes("fetch") ||
		message.toLowerCase().includes("network")
	) {
		return "Impossible de contacter le serveur. Vérifiez votre connexion.";
	}
	if (mode === "signIn") {
		return "Connexion impossible. Vérifiez vos identifiants.";
	}
	return "Création de compte impossible. Veuillez réessayer.";
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
			return { ok: false, message: toFrenchAuthMessage(error, "signUp") };
		set({ user: data.user });
		return { ok: true };
	},

	signUpAnonymous: async (pseudo, password) => {
		const email = buildAnonymousEmail(pseudo);
		const { data, error } = await supabase.auth.signUp({ email, password });
		if (error) {
			const message =
				error.code === "user_already_exists" ||
				error.message.toLowerCase().includes("already registered")
					? "Ce pseudo est déjà utilisé. Choisissez-en un autre."
					: toFrenchAuthMessage(error, "signUp");
			return { ok: false, message };
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
			return { ok: false, message: toFrenchAuthMessage(error, "signIn") };
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
			const message =
				error.code === "invalid_credentials" ||
				error.message.toLowerCase().includes("invalid login credentials")
					? "Pseudo ou mot de passe incorrect."
					: toFrenchAuthMessage(error, "signIn");
			return { ok: false, message };
		}
		set({ user: data.user });
		return { ok: true };
	},

	resetPassword: async (email) => {
		const { error } = await supabase.auth.resetPasswordForEmail(email);
		if (error)
			return { ok: false, message: toFrenchAuthMessage(error, "signIn") };
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
