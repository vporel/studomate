"use client";

import { isSupabaseConfigured } from "@/persistence/repositories/supabase-client";
import { useAuthStore } from "@/ui/stores/auth/auth.store";
import { Button, Stack, Typography } from "@mui/material";
import { useEffect } from "react";
import { useShallow } from "zustand/shallow";

/**
 * État de la reprise de progression (voir `ModuleStepper.tsx`), affiché uniquement sur la page
 * d'accueil du module — pas répété à chaque étape d'une leçon, pour ne pas pousser la
 * connexion : invite à se connecter si nécessaire, ou confirme que la progression est
 * sauvegardée pour un utilisateur déjà connecté.
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
		<Stack direction="row" alignItems="center" flexWrap="wrap" gap={1.5}>
			<Typography variant="body2" color="text.secondary">
				{hint}
			</Typography>
			<Button size="small" onClick={() => setAuthModalVisible(true, hint)}>
				{cta}
			</Button>
		</Stack>
	);
}
