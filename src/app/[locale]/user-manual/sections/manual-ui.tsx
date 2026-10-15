"use client";

import { Box, Typography } from "@mui/material";

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

/** Figure du manuel : image statique de `public/user-manual/`, centrée et jamais plus large que la page. */
export function ManualFigure({
	src,
	alt,
	width,
}: {
	src: string;
	alt: string;
	width: number;
}) {
	return (
		<Box sx={{ textAlign: "center" }} mb={2}>
			<Box
				component="img"
				src={src}
				alt={alt}
				sx={{ width, maxWidth: "100%", height: "auto" }}
			/>
		</Box>
	);
}
