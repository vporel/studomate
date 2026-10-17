"use client";

import { Paper, alpha, type PaperProps, type Theme } from "@mui/material";

/** Outlined panel with a faint primary-coloured background. */
export default function TintedPaper({ sx, ...props }: PaperProps) {
	return (
		<Paper
			variant="outlined"
			{...props}
			sx={[
				{ background: (th: Theme) => alpha(th.palette.primary.main, 0.05) },
				...(Array.isArray(sx) ? sx : [sx]),
			]}
		/>
	);
}
