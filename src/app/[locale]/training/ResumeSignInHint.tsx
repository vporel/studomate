"use client";

import { isSupabaseConfigured } from "@/persistence/repositories/supabase-client";
import { useAuthStore } from "@/ui/stores/auth/auth.store";
import { Link, Stack, Typography } from "@mui/material";
import { useEffect } from "react";
import { useShallow } from "zustand/shallow";

/**
 * État de la reprise de progression (voir `ModuleStepper.tsx`), affiché uniquement sur la page
 * d'accueil du module : précise que la progression est gardée dans ce navigateur et invite à se
 * connecter pour la synchroniser, ou confirme la sauvegarde sur le compte d'un utilisateur
 * connecté.
 */
export default function ResumeSignInHint({
	hint,
	cta,
	savedHint,
}: {
	hint: string;
	cta: string;
	savedHint: string;
}) {
	const { user, loading, init, setAuthModalVisible } = useAuthStore(
		useShallow((state) => ({
			user: state.user,
			loading: state.loading,
			init: state.init,
			setAuthModalVisible: state.setAuthModalVisible,
		})),
	);

	useEffect(() => {
		if (isSupabaseConfigured) void init();
	}, [init]);

	if (!isSupabaseConfigured || loading) return null;

	if (user) {
		return (
			<Typography variant="body2" color="text.secondary">
				{savedHint}
			</Typography>
		);
	}

	return (
		<Stack gap={0.5} alignItems="flex-start">
			<Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-line" }}>
				{hint}
			</Typography>
			<Link
				component="button"
				type="button"
				variant="body2"
				onClick={() => setAuthModalVisible(true, hint)}
			>
				{cta}
			</Link>
		</Stack>
	);
}
