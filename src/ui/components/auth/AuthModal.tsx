"use client";

import CustomModal from "@/ui/lib/mui/CustomModal";
import { useT } from "@/ui/i18n/useT";
import { useAuthStore } from "@/ui/stores/auth/auth.store";
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

	const t = useT("auth");
	const tError = useT("auth.errors");
	const [screen, setScreen] = useState<Screen>("signIn");
	const [signUpMode, setSignUpMode] = useState<SignUpMode>("anonymous");
	const [signInMode, setSignInMode] = useState<SignUpMode>("anonymous");
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
			setError(tError(result.code));
			return;
		}
		onClose();
	}, [signInMode, pseudo, email, password, signIn, signInAnonymous, onClose, tError]);

	const onSubmitSignUp = useCallback(async () => {
		setSubmitting(true);
		setError(null);
		const result =
			signUpMode === "anonymous"
				? await signUpAnonymous(pseudo, password)
				: await signUp(email, password);
		setSubmitting(false);
		if (!result.ok) {
			setError(tError(result.code));
			return;
		}
		onClose();
	}, [signUpMode, pseudo, email, password, signUp, signUpAnonymous, onClose, tError]);

	const onSubmitResetPassword = useCallback(async () => {
		setSubmitting(true);
		setError(null);
		const result = await resetPassword(email);
		setSubmitting(false);
		if (!result.ok) {
			setError(tError(result.code));
			return;
		}
		setSuccessMessage(t("resetPassword.emailSent"));
	}, [email, resetPassword, t, tError]);

	const title = t(`titles.${screen}`);

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
							{t("modeSelector.pseudo")}
						</Button>
						<Button
							variant={signInMode === "real" ? "contained" : "outlined"}
							size="small"
							onClick={() => {
								setSignInMode("real");
								resetForm();
							}}
						>
							{t("modeSelector.email")}
						</Button>
					</Box>

					{signInMode === "anonymous" ? (
						<TextField
							label={t("fields.pseudo")}
							value={pseudo}
							onChange={(e) => setPseudo(e.target.value)}
							required
							autoFocus
						/>
					) : (
						<TextField
							label={t("fields.email")}
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							autoFocus
						/>
					)}

					<TextField
						label={t("fields.password")}
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
						{t("signIn.submit")}
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
							{t("signIn.forgotPassword")}
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
						{t("signIn.noAccount")}
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
							{t("modeSelector.anonymous")}
						</Button>
						<Button
							variant={signUpMode === "real" ? "contained" : "outlined"}
							size="small"
							onClick={() => {
								setSignUpMode("real");
								resetForm();
							}}
						>
							{t("modeSelector.withEmail")}
						</Button>
					</Box>

					{signUpMode === "anonymous" ? (
						<>
							<Alert severity="info" sx={{ fontSize: "0.85rem" }}>
								{t("signUp.anonymousNotice")}
							</Alert>
							<TextField
								label={t("fields.pseudo")}
								value={pseudo}
								onChange={(e) => setPseudo(e.target.value)}
								required
								autoFocus
								helperText={t("fields.pseudoHelper")}
							/>
						</>
					) : (
						<TextField
							label={t("fields.email")}
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							autoFocus
						/>
					)}

					<TextField
						label={t("fields.password")}
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
						{t("signUp.submit")}
					</Button>

					<Divider />

					<Button
						variant="text"
						onClick={() => {
							resetForm();
							setScreen("signIn");
						}}
					>
						{t("signUp.haveAccount")}
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
						{t("resetPassword.intro")}
					</Typography>

					<TextField
						label={t("fields.email")}
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
							{t("resetPassword.submit")}
						</Button>
					)}

					<Button
						variant="text"
						onClick={() => {
							resetForm();
							setScreen("signIn");
						}}
					>
						{t("resetPassword.backToSignIn")}
					</Button>
				</Box>
			)}
		</CustomModal>
	);
}
