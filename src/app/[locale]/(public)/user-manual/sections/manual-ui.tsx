"use client";

import { Typography } from "@mui/material";

/** Liste à puces d'un tableau de chaînes de traduction (`t.raw(...)`). */
export function ManualList({ items }: { items: readonly string[] }) {
	return (
		<Typography component="ul" sx={{ pl: 3 }} mb={2}>
			{items.map((item, i) => (
				<li key={i}>{item}</li>
			))}
		</Typography>
	);
}
