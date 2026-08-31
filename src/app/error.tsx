"use client";

import routes from "@/app/routes";
import { Box, Button, Container, Typography } from "@mui/material";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		Sentry.captureException(error);
	}, [error]);

	return (
		<Container maxWidth="sm" sx={{ my: 8, textAlign: "center" }}>
			<Typography variant="h2" component="h1" color="primary" gutterBottom>
				Une erreur est survenue
			</Typography>
			<Typography sx={{ mb: 4 }}>
				Votre travail local est préservé. Vous pouvez recharger la page pour
				reprendre.
			</Typography>
			<Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
				<Button onClick={reset} variant="contained">
					Recharger
				</Button>
				<Button component={Link} href={routes.home()} variant="outlined">
					Accueil
				</Button>
			</Box>
		</Container>
	);
}
