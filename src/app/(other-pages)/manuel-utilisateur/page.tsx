"use client";

import { Container, Divider, Grid, Typography } from "@mui/material";
import { useState } from "react";
import ManualNav from "./ManualNav";
import ManualSections from "./ManualSections";

export default function UserManual() {
	const [selected, setSelected] = useState<string>("intro");

	return (
		<Container maxWidth="lg" sx={{ my: 4, minHeight: "70vh" }}>
			<Typography variant="h2" color="primary" gutterBottom>
				Manuel utilisateur
			</Typography>
			<Divider sx={{ my: 2 }} />

			<Grid container spacing={2}>
				<Grid size={{ xs: 12, md: 3 }}>
					<ManualNav selected={selected} onSelect={setSelected} />
				</Grid>
				<Grid size={{ xs: 12, md: 9 }}>
					<ManualSections selected={selected} />
				</Grid>
			</Grid>
		</Container>
	);
}
