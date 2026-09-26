"use client";

import { useT } from "@/ui/i18n/useT";
import { TextField } from "@mui/material";
import { AuthMode } from "./AuthModeSelector";

type AuthIdentityFieldProps = {
	mode: AuthMode;
	pseudo: string;
	email: string;
	onPseudoChange: (value: string) => void;
	onEmailChange: (value: string) => void;
	pseudoHelperText?: string;
};

export default function AuthIdentityField({
	mode,
	pseudo,
	email,
	onPseudoChange,
	onEmailChange,
	pseudoHelperText,
}: AuthIdentityFieldProps) {
	const t = useT("auth");

	return mode === "anonymous" ? (
		<TextField
			label={t("fields.pseudo")}
			value={pseudo}
			onChange={(e) => onPseudoChange(e.target.value)}
			required
			autoFocus
			helperText={pseudoHelperText}
		/>
	) : (
		<TextField
			label={t("fields.email")}
			type="email"
			value={email}
			onChange={(e) => onEmailChange(e.target.value)}
			required
			autoFocus
		/>
	);
}
