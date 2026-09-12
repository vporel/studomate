import routes from "@/app/routes";
import { Box, Button, Container, Typography } from "@mui/material";
import Link from "next/link";

export default function NotFound() {
	return (
		<Container maxWidth="sm" sx={{ my: 8, textAlign: "center" }}>
			<Typography variant="h2" component="h1" color="primary" gutterBottom>
				Page introuvable
			</Typography>
			<Typography sx={{ mb: 4 }}>
				La page que vous cherchez n’existe pas ou a été déplacée.
			</Typography>
			<Box>
				<Button component={Link} href={routes.home()} variant="contained">
					Retour à l’accueil
				</Button>
			</Box>
		</Container>
	);
}
