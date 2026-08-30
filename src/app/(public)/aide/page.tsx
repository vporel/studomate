"use client";

import { Container, Divider, Typography } from "@mui/material";

export default function Help() {
	return (
		<Container maxWidth="md" sx={{ my: 4 }}>
			<Typography variant="h2" component="h1" color="primary" gutterBottom>
				Aide
			</Typography>
			<Divider sx={{ my: 2 }} />
		</Container>
	);
}
