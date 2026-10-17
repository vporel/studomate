"use client";

import { Box, Button } from "@mui/material";

export type AuthMode = "anonymous" | "real";

type AuthModeSelectorProps = {
	mode: AuthMode;
	anonymousLabel: string;
	realLabel: string;
	onSelect: (mode: AuthMode) => void;
};

export default function AuthModeSelector({
	mode,
	anonymousLabel,
	realLabel,
	onSelect,
}: AuthModeSelectorProps) {
	return (
		<Box sx={{ display: "flex", gap: 1 }}>
			<Button
				variant={mode === "anonymous" ? "contained" : "outlined"}
				size="small"
				onClick={() => onSelect("anonymous")}
			>
				{anonymousLabel}
			</Button>
			<Button
				variant={mode === "real" ? "contained" : "outlined"}
				size="small"
				onClick={() => onSelect("real")}
			>
				{realLabel}
			</Button>
		</Box>
	);
}
