"use client";

import { APP_CONTACT_EMAIL } from "@/app-info";
import { Box, Container, Divider, Typography } from "@mui/material";

export default function Contact() {
	return (
		<Container maxWidth="md" sx={{ my: 4, minHeight: "70vh" }}>
			<Typography variant="h2" component="h1" color="primary" gutterBottom>
				Contactez-nous!
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography textAlign="justify">
				Nom : <strong>Vivian NKOUANANG</strong>
			</Typography>
			<Typography textAlign="justify">
				Email :{" "}
				<Box
					component="a"
					href={`mailto:${APP_CONTACT_EMAIL}`}
					sx={{ color: (th) => th.palette.primary.main }}
				>
					{APP_CONTACT_EMAIL}
				</Box>
			</Typography>
		</Container>
	);
}
