"use client";

import CustomModal from "@/ui/lib/mui/CustomModal";
import { isAnonymousUser, useAuthStore } from "@/ui/stores/auth/auth.store";
import {
	Alert,
	Box,
	Button,
	Divider,
	TextField,
	Typography,
} from "@mui/material";
import { useCallback, useState } from "react";
import { useShallow } from "zustand/shallow";

type Screen = "signIn" | "signUp" | "resetPassword";
type SignUpMode = "anonymous" | "real";

export default function AuthModal() {
	const {
		user,
		authModalVisible,
		authModalPrompt,
		setAuthModalVisible,
		signIn,
		signUp,
		signUpAnonymous,
		signInAnonymous,
		resetPassword,
	} = useAuthStore(
		useShallow((state) => ({
			user: state.user,
			authModalVisible: state.ui.authModalVisible,
			authModalPrompt: state.ui.authModalPrompt,
			setAuthModalVisible: state.setAuthModalVisible,
			signIn: state.signIn,
			signUp: state.signUp,
			signUpAnonymous: state.signUpAnonymous,
			signInAnonymous: state.signInAnonymous,
			resetPassword: state.resetPassword,
		})),
	);

	const [screen, setScreen] = useState<Screen>("signIn");
	const [signUpMode, setSignUpMode] = useState<SignUpMode>("anonymous");
	const [signInMode, setSignInMode] = useState<SignUpMode>(
		isAnonymousUser(user) ? "anonymous" : "real",
	);
	const [email, setEmail] = useState("");
	const [pseudo, setPseudo] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const resetForm = useCallback(() => {
		setEmail("");
		setPseudo("");
		setPassword("");
		setError(null);
		setSuccessMessage(null);
	}, []);

	const onClose = useCallback(() => {
		setAuthModalVisible(false);
		resetForm();
		setScreen("signIn");
	}, [setAuthModalVisible, resetForm]);

	const onSubmitSignIn = useCallback(async () => {
		setSubmitting(true);
		setError(null);
		const result =
			signInMode === "anonymous"
				? await signInAnonymous(pseudo, password)
				: await signIn(email, password);
		setSubmitting(false);
		if (!result.ok) {
			setError(result.message);
			return;
		}
		onClose();
	}, [signInMode, pseudo, email, password, signIn, signInAnonymous, onClose]);

	const onSubmitSignUp = useCallback(async () => {
		setSubmitting(true);
		setError(null);
		const result =
			signUpMode === "anonymous"
				? await signUpAnonymous(pseudo, password)
				: await signUp(email, password);
		setSubmitting(false);
		if (!result.ok) {
			setError(result.message);
			return;
		}
		onClose();
	}, [signUpMode, pseudo, email, password, signUp, signUpAnonymous, onClose]);

	const onSubmitResetPassword = useCallback(async () => {
		setSubmitting(true);
		setError(null);
		const result = await resetPassword(email);
		setSubmitting(false);
		if (!result.ok) {
			setError(result.message);
			return;
		}
		setSuccessMessage(
			"Un email de réinitialisation a été envoyé. Vérifiez votre boîte mail.",
		);
	}, [email, resetPassword]);

	const title =
		screen === "signIn"
			? "Se connecter"
			: screen === "signUp"
				? "Créer un compte"
				: "Mot de passe oublié";

	return (
		<CustomModal
			open={authModalVisible}
			onClose={onClose}
			title={title}
			width={440}
		>
			{authModalPrompt && (
				<Alert severity="info" sx={{ mb: 2 }}>
					{authModalPrompt}
				</Alert>
			)}
			{screen === "signIn" && (
				<Box
					component="form"
					onSubmit={(e) => {
						e.preventDefault();
						void onSubmitSignIn();
					}}
					sx={{ display: "flex", flexDirection: "column", gap: 2 }}
				>
					{/* Sélecteur de mode connexion */}
					<Box sx={{ display: "flex", gap: 1 }}>
						<Button
							variant={signInMode === "anonymous" ? "contained" : "outlined"}
							size="small"
							onClick={() => {
								setSignInMode("anonymous");
								resetForm();
							}}
						>
							Pseudo
						</Button>
						<Button
							variant={signInMode === "real" ? "contained" : "outlined"}
							size="small"
							onClick={() => {
								setSignInMode("real");
								resetForm();
							}}
						>
							Email
						</Button>
					</Box>

					{signInMode === "anonymous" ? (
						<TextField
							label="Pseudo"
							value={pseudo}
							onChange={(e) => setPseudo(e.target.value)}
							required
							autoFocus
						/>
					) : (
						<TextField
							label="Email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							autoFocus
						/>
					)}

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
						Se connecter
					</Button>

					{signInMode === "real" && (
						<Button
							variant="text"
							size="small"
							onClick={() => {
								resetForm();
								setScreen("resetPassword");
							}}
						>
							Mot de passe oublié ?
						</Button>
					)}

					<Divider />

					<Button
						variant="text"
						onClick={() => {
							resetForm();
							setScreen("signUp");
						}}
					>
						Pas de compte ? En créer un
					</Button>
				</Box>
			)}

			{screen === "signUp" && (
				<Box
					component="form"
					onSubmit={(e) => {
						e.preventDefault();
						void onSubmitSignUp();
					}}
					sx={{ display: "flex", flexDirection: "column", gap: 2 }}
				>
					{/* Sélecteur de mode création */}
					<Box sx={{ display: "flex", gap: 1 }}>
						<Button
							variant={signUpMode === "anonymous" ? "contained" : "outlined"}
							size="small"
							onClick={() => {
								setSignUpMode("anonymous");
								resetForm();
							}}
						>
							Anonyme
						</Button>
						<Button
							variant={signUpMode === "real" ? "contained" : "outlined"}
							size="small"
							onClick={() => {
								setSignUpMode("real");
								resetForm();
							}}
						>
							Avec email
						</Button>
					</Box>

					{signUpMode === "anonymous" ? (
						<>
							<Alert severity="info" sx={{ fontSize: "0.85rem" }}>
								Aucune donnée personnelle n&apos;est collectée en mode anonyme.
								En contrepartie,{" "}
								<strong>la récupération du mot de passe est impossible</strong>{" "}
								si vous l&apos;oubliez.
							</Alert>
							<TextField
								label="Pseudo"
								value={pseudo}
								onChange={(e) => setPseudo(e.target.value)}
								required
								autoFocus
								helperText="Votre identifiant public. Doit être unique."
							/>
						</>
					) : (
						<TextField
							label="Email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							autoFocus
						/>
					)}

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
						Créer le compte
					</Button>

					<Divider />

					<Button
						variant="text"
						onClick={() => {
							resetForm();
							setScreen("signIn");
						}}
					>
						Déjà un compte ? Se connecter
					</Button>
				</Box>
			)}

			{screen === "resetPassword" && (
				<Box
					component="form"
					onSubmit={(e) => {
						e.preventDefault();
						void onSubmitResetPassword();
					}}
					sx={{ display: "flex", flexDirection: "column", gap: 2 }}
				>
					<Typography variant="body2" color="text.secondary">
						Entrez votre adresse email. Vous recevrez un lien pour réinitialiser
						votre mot de passe.
					</Typography>

					<TextField
						label="Email"
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
						autoFocus
					/>

					{error && (
						<Typography color="error" fontSize="0.9rem">
							{error}
						</Typography>
					)}
					{successMessage && <Alert severity="success">{successMessage}</Alert>}

					{!successMessage && (
						<Button type="submit" variant="contained" disabled={submitting}>
							Envoyer le lien
						</Button>
					)}

					<Button
						variant="text"
						onClick={() => {
							resetForm();
							setScreen("signIn");
						}}
					>
						Retour à la connexion
					</Button>
				</Box>
			)}
		</CustomModal>
	);
}
