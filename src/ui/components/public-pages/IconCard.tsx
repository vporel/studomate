"use client";

import { Box, Paper, Typography, alpha, type Theme } from "@mui/material";
import type { ComponentType, ReactNode } from "react";

type Props = {
	icon: ComponentType;
	title: string;
	children: ReactNode;
	image?: { src: string; alt: string; contain?: boolean };
};

/** Outlined card with an optional header image, a tinted icon badge, a title and a short text. */
export default function IconCard({
	icon: Icon,
	title,
	children,
	image,
}: Props) {
	return (
		<Paper
			variant="outlined"
			sx={{ flex: "1 1 240px", minWidth: 0, overflow: "hidden" }}
		>
			{image && (
				<Box
					component="img"
					src={image.src}
					alt={image.alt}
					loading="lazy"
					decoding="async"
					sx={{
						display: "block",
						width: "100%",
						aspectRatio: "16 / 10",
						objectFit: image.contain ? "contain" : "cover",
						objectPosition: "top",
						borderBottom: "1px solid",
						borderColor: "divider",
						background: "#fff",
					}}
				/>
			)}
			<Box sx={{ p: 2.5 }}>
				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						width: 44,
						height: 44,
						borderRadius: 3,
						color: "primary.main",
						background: (th: Theme) => alpha(th.palette.primary.main, 0.1),
					}}
				>
					<Icon />
				</Box>
				<Typography variant="h6" component="h3" fontWeight={700} mt={1.5}>
					{title}
				</Typography>
				<Typography variant="body2" color="text.secondary" mt={0.5}>
					{children}
				</Typography>
			</Box>
		</Paper>
	);
}
