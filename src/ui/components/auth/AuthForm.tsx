"use client";

import { Box } from "@mui/material";
import { FormEvent, ReactNode } from "react";

type AuthFormProps = {
	onSubmit: () => void;
	children: ReactNode;
};

export default function AuthForm({ onSubmit, children }: AuthFormProps) {
	return (
		<Box
			component="form"
			onSubmit={(e: FormEvent) => {
				e.preventDefault();
				onSubmit();
			}}
			sx={{ display: "flex", flexDirection: "column", gap: 2 }}
		>
			{children}
		</Box>
	);
}
