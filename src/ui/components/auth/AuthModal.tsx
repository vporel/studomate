"use client";

import CustomModal from "@/ui/lib/mui/CustomModal";
import { useAuthStore } from "@/ui/stores/auth/auth.store";
import { Box, Button, TextField, Typography } from "@mui/material";
import { useCallback, useState } from "react";
import { useShallow } from "zustand/shallow";

export default function AuthModal() {
	const { authModalVisible, setAuthModalVisible, signIn, signUp } = useAuthStore(
		useShallow((state) => ({
			authModalVisible: state.ui.authModalVisible,
			setAuthModalVisible: state.setAuthModalVisible,
			signIn: state.signIn,
			signUp: state.signUp,
		})),
	);

	const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const onClose = useCallback(() => {
		setAuthModalVisible(false);
		setError(null);
		setPassword("");
	}, [setAuthModalVisible]);

	const onSubmit = useCallback(async () => {
		setSubmitting(true);
		setError(null);
		const result = mode === "signIn" ? await signIn(email, password) : await signUp(email, password);
		setSubmitting(false);
		if (!result.ok) {
			setError(result.message);
			return;
		}
		onClose();
	}, [mode, email, password, signIn, signUp, onClose]);

	return (
		<CustomModal
			open={authModalVisible}
			onClose={onClose}
			title={mode === "signIn" ? "Se connecter" : "Créer un compte"}
			width={400}
		>
			<Box
				component="form"
				onSubmit={(e) => {
					e.preventDefault();
					void onSubmit();
				}}
				sx={{ display: "flex", flexDirection: "column", gap: 2 }}
			>
				<TextField
					label="Email"
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
					autoFocus
				/>
				<TextField
					label="Mot de passe"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
				/>
				{error && (
					<Typography color="error" fontSize="0.9rem">
						{error}
					</Typography>
				)}
				<Button type="submit" variant="contained" disabled={submitting}>
					{mode === "signIn" ? "Se connecter" : "Créer le compte"}
				</Button>
				<Button
					variant="text"
					onClick={() => {
						setMode((m) => (m === "signIn" ? "signUp" : "signIn"));
						setError(null);
					}}
				>
					{mode === "signIn" ? "Pas de compte ? En créer un" : "Déjà un compte ? Se connecter"}
				</Button>
			</Box>
		</CustomModal>
	);
}
