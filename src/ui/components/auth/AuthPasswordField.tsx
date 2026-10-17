"use client";

import { useT } from "@/ui/i18n/useT";
import { TextField } from "@mui/material";

type AuthPasswordFieldProps = {
	value: string;
	onChange: (value: string) => void;
};

export default function AuthPasswordField({
	value,
	onChange,
}: AuthPasswordFieldProps) {
	const t = useT("auth");

	return (
		<TextField
			label={t("fields.password")}
			type="password"
			value={value}
			onChange={(e) => onChange(e.target.value)}
			required
		/>
	);
}
