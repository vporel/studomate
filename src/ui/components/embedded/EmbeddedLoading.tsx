"use client";

import { Box, CircularProgress } from "@mui/material";

/** Fills the space reserved for something that is still being loaded. */
export default function EmbeddedLoading({
	height = "100%",
	label,
}: {
	height?: number | string;
	label?: string;
}) {
	return (
		<Box
			sx={{
				flex: 1,
				height,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<CircularProgress aria-label={label} />
		</Box>
	);
}
