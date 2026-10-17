"use client";

import { getPathname } from "@/i18n/navigation";
import { Box, Button, Container, Typography } from "@mui/material";
import { notFound as en } from "@/i18n/messages/en/public.json";
import { notFound as fr } from "@/i18n/messages/fr/public.json";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const MESSAGES = { fr, en };

/**
 * Not-found page rendered outside any locale layout: the language is read from the `/en` URL
 * prefix and applied to `<html lang>` once mounted.
 */
export default function NotFound() {
	const pathname = usePathname();
	const locale = /^\/en(\/|$)/.test(pathname) ? "en" : "fr";
	const messages = MESSAGES[locale];

	useEffect(() => {
		document.documentElement.lang = locale;
	}, [locale]);

	return (
		<Container maxWidth="sm" sx={{ my: 8, textAlign: "center" }}>
			<Typography variant="h2" component="h1" color="primary" gutterBottom>
				{messages.title}
			</Typography>
			<Typography sx={{ mb: 4 }}>{messages.body}</Typography>
			<Box>
				<Button
					component={Link}
					href={getPathname({ locale, href: "/" })}
					variant="contained"
				>
					{messages.back}
				</Button>
			</Box>
		</Container>
	);
}
