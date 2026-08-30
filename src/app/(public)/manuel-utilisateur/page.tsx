"use client";

import { Container, Divider, Grid, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import ManualContentIndex, {
	ManualContentIndex as ManualContentIndexType,
} from "./ManualContentIndex";
import ManualNav from "./ManualNav";
import ManualSearch from "./ManualSearch";
import ManualSections from "./ManualSections";

const DEFAULT_SECTION = "intro";

export default function UserManual() {
	const [selected, setSelected] = useState<string>(DEFAULT_SECTION);
	const [contentIndex, setContentIndex] = useState<ManualContentIndexType>({});

	useEffect(() => {
		const sectionFromHash = () =>
			window.location.hash.slice(1) || DEFAULT_SECTION;
		setSelected(sectionFromHash());
		// Suit le retour/avance du navigateur, en plus des clics gérés par handleSelect.
		const onHashChange = () => setSelected(sectionFromHash());
		window.addEventListener("hashchange", onHashChange);
		return () => window.removeEventListener("hashchange", onHashChange);
	}, []);

	const handleSelect = useCallback((id: string) => {
		setSelected(id);
		// pushState (pas replaceState) : rend chaque section atteignable par le bouton retour,
		// et l'URL avec ancre reste partageable.
		window.history.pushState(null, "", `#${id}`);
	}, []);

	return (
		<Container maxWidth="lg" sx={{ my: 4, minHeight: "70vh" }}>
			<Typography variant="h2" component="h1" color="primary" gutterBottom>
				Manuel utilisateur
			</Typography>
			<Divider sx={{ my: 2 }} />

			<ManualContentIndex onReady={setContentIndex} />
			<ManualSearch contentIndex={contentIndex} onSelect={handleSelect} />

			<Grid container spacing={2}>
				<Grid size={{ xs: 12, md: 3 }}>
					<ManualNav selected={selected} onSelect={handleSelect} />
				</Grid>
				<Grid size={{ xs: 12, md: 9 }}>
					<ManualSections selected={selected} />
				</Grid>
			</Grid>
		</Container>
	);
}
