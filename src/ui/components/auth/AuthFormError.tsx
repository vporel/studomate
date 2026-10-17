"use client";

import { Typography } from "@mui/material";

export default function AuthFormError({ error }: { error: string | null }) {
	if (!error) return null;
	return (
		<Typography color="error" fontSize="0.9rem">
			{error}
		</Typography>
	);
}
