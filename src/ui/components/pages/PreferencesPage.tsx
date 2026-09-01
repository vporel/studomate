"use client";

import {
	getPreferredSaveLocation,
	setPreferredSaveLocation,
} from "@/persistence/preferences.storage";
import { StorageLocation } from "@/persistence/repositories/project.repository";
import { PageData } from "@/ui/stores/project/project.store";
import { Box, Typography } from "@mui/material";
import { useState } from "react";
import StorageLocationRadioGroup from "../projects/StorageLocationRadioGroup";
import Page from "./Page";

export const PREFERENCES_PAGE_ID = "preferences";
export const PREFERENCES_PAGE_DATA: PageData = {
	id: PREFERENCES_PAGE_ID,
	type: "preferences",
	title: "Préférences",
};

const PreferencesPage = () => {
	const [location, setLocation] = useState<StorageLocation>(
		() => getPreferredSaveLocation() ?? "local",
	);

	const handleChange = (next: StorageLocation) => {
		setLocation(next);
		setPreferredSaveLocation(next);
	};

	return (
		<Page
			pageId={PREFERENCES_PAGE_ID}
			sx={{ justifyContent: "center", alignItems: "start" }}
		>
			<Box sx={{ padding: "2rem 1rem", width: 600 }}>
				<Typography variant="h2">Préférences de l'application</Typography>
				<Box sx={{ mt: 3 }}>
					<Typography variant="h6">Lieu de stockage par défaut</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
						Utilisé pour le premier enregistrement d&apos;un projet neuf.
					</Typography>
					<StorageLocationRadioGroup value={location} onChange={handleChange} />
				</Box>
			</Box>
		</Page>
	);
};

export default PreferencesPage;
