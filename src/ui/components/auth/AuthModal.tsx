"use client";

import CustomModal from "@/ui/components/mui/CustomModal";
import { useT } from "@/ui/i18n/useT";
import { useAuthStore } from "@/ui/stores/auth/auth.store";
import { getStoredUserProfile } from "@/persistence/user-profile.storage";
import { EMPTY_USER_PROFILE, UserProfile } from "@/user-profile/user-profile";
import UserProfileFields from "@/ui/components/profile/UserProfileFields";
import { Alert, Button, Divider, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";
import AuthForm from "./AuthForm";
import AuthFormError from "./AuthFormError";
import AuthIdentityField from "./AuthIdentityField";
import AuthModeSelector, { AuthMode } from "./AuthModeSelector";
import AuthPasswordField from "./AuthPasswordField";

type Screen = "signIn" | "signUp" | "resetPassword";
type SignUpMode = AuthMode;

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
	const [profile, setProfile] = useState<UserProfile>(EMPTY_USER_PROFILE);

	const resetForm = useCallback(() => {
		setEmail("");
		setPseudo("");
		setPassword("");
		setError(null);
		setSuccessMessage(null);
	}, []);

	useEffect(() => {
		if (authModalVisible) {
			setProfile(getStoredUserProfile() ?? EMPTY_USER_PROFILE);
		}
	}, [authModalVisible]);

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
				? await signUpAnonymous(pseudo, password, profile)
				: await signUp(email, password, profile);
		setSubmitting(false);
		if (!result.ok) {
			setError(tError(result.code));
			return;
		}
		onClose();
	}, [signUpMode, pseudo, email, password, profile, signUp, signUpAnonymous, onClose, tError]);

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
			width={540}
		>
			{authModalPrompt && (
				<Alert severity="info" sx={{ mb: 2 }}>
					{authModalPrompt}
				</Alert>
			)}
			{screen === "signIn" && (
				<AuthForm onSubmit={() => void onSubmitSignIn()}>
					<AuthModeSelector
						mode={signInMode}
						anonymousLabel={t("modeSelector.pseudo")}
						realLabel={t("modeSelector.email")}
						onSelect={(mode) => {
							setSignInMode(mode);
							resetForm();
						}}
					/>

					<AuthIdentityField
						mode={signInMode}
						pseudo={pseudo}
						email={email}
						onPseudoChange={setPseudo}
						onEmailChange={setEmail}
					/>

					<AuthPasswordField value={password} onChange={setPassword} />

					<AuthFormError error={error} />

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
				</AuthForm>
			)}

			{screen === "signUp" && (
				<AuthForm onSubmit={() => void onSubmitSignUp()}>
					<AuthModeSelector
						mode={signUpMode}
						anonymousLabel={t("modeSelector.anonymous")}
						realLabel={t("modeSelector.withEmail")}
						onSelect={(mode) => {
							setSignUpMode(mode);
							resetForm();
						}}
					/>

					{signUpMode === "anonymous" && (
						<Alert severity="info" sx={{ fontSize: "0.85rem" }}>
							{t("signUp.anonymousNotice")}
						</Alert>
					)}
					<AuthIdentityField
						mode={signUpMode}
						pseudo={pseudo}
						email={email}
						onPseudoChange={setPseudo}
						onEmailChange={setEmail}
						pseudoHelperText={t("fields.pseudoHelper")}
					/>

					<AuthPasswordField value={password} onChange={setPassword} />

					<UserProfileFields value={profile} onChange={setProfile} />

					<AuthFormError error={error} />

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
				</AuthForm>
			)}

			{screen === "resetPassword" && (
				<AuthForm onSubmit={() => void onSubmitResetPassword()}>
					<Typography variant="body2" color="text.secondary">
						{t("resetPassword.intro")}
					</Typography>

					<AuthIdentityField
						mode="real"
						pseudo={pseudo}
						email={email}
						onPseudoChange={setPseudo}
						onEmailChange={setEmail}
					/>

					<AuthFormError error={error} />
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
				</AuthForm>
			)}
		</CustomModal>
	);
}
