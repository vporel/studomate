"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
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
		<html lang="fr">
			<body
				style={{
					fontFamily: "system-ui, sans-serif",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					minHeight: "100vh",
					margin: 0,
					padding: "2rem",
					textAlign: "center",
				}}
			>
				<h1 style={{ color: "#1976d2" }}>Une erreur est survenue</h1>
				<p style={{ maxWidth: "32rem" }}>
					Votre travail local est préservé. Vous pouvez recharger la page pour
					reprendre.
				</p>
				<button
					onClick={reset}
					style={{
						marginTop: "1rem",
						padding: "0.6rem 1.4rem",
						fontSize: "1rem",
						color: "#fff",
						background: "#1976d2",
						border: "none",
						borderRadius: "4px",
						cursor: "pointer",
					}}
				>
					Recharger
				</button>
			</body>
		</html>
	);
}
