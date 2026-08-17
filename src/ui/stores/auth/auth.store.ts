import { supabase } from "@/persistence/repositories/supabase-client";
import { User } from "@supabase/supabase-js";
import { createStore, useStore } from "zustand";

export type AuthResult = { ok: true } | { ok: false; message: string };

export type AuthStoreState = {
	user: User | null;
	loading: boolean;
	ui: {
		authModalVisible: boolean;
	};
	init: () => Promise<void>;
	signUp: (email: string, password: string) => Promise<AuthResult>;
	signIn: (email: string, password: string) => Promise<AuthResult>;
	signOut: () => Promise<void>;
	setAuthModalVisible: (visible: boolean) => void;
};

/**
 * `init()` peut être appelé depuis plusieurs composants montés simultanément (barre de titre,
 * écran de démarrage) : ce garde évite de s'abonner plusieurs fois à `onAuthStateChange`.
 */
let initPromise: Promise<void> | null = null;

export const authStore = createStore<AuthStoreState>((set) => ({
	user: null,
	loading: true,
	ui: {
		authModalVisible: false,
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
		if (error) return { ok: false, message: error.message };
		set({ user: data.user });
		return { ok: true };
	},

	signIn: async (email, password) => {
		const { data, error } = await supabase.auth.signInWithPassword({ email, password });
		if (error) return { ok: false, message: error.message };
		set({ user: data.user });
		return { ok: true };
	},

	signOut: async () => {
		await supabase.auth.signOut();
		set({ user: null });
	},

	setAuthModalVisible: (visible) => set((state) => ({ ui: { ...state.ui, authModalVisible: visible } })),
}));

export function useAuthStore<T>(selector: (state: AuthStoreState) => T) {
	return useStore(authStore, selector);
}
