"use client";

import { Box, Container, Divider, Typography } from "@mui/material";

export default function Contact() {
	return (
		<Container maxWidth="md" sx={{ my: 4, minHeight: "70vh" }}>
			<Typography variant="h2" color="primary" gutterBottom>
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
					href="mailto:dev.vporel@gmail.com"
					sx={{ color: (th) => th.palette.primary.main }}
				>
					dev.vporel@gmail.com
				</Box>
			</Typography>
		</Container>
	);
}
