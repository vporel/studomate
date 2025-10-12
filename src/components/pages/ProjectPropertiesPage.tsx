"use client";

import { alpha, Box, Divider, Grid, Typography } from "@mui/material";
import { useState } from "react";
import { useProjectContext } from "../projects/ProjectContext";
import Page from "./Page";
import { ProjectPropertiesPageData } from "./context/pages-data";

export const PROJECT_PROPERTIES_PAGE_ID = "project-properties";
export const PROJECT_PROPERTIES_PAGE_DATA: ProjectPropertiesPageData = {
	type: "project-properties",
	title: "Propriétés du projet",
};

const PropertyLabel = ({ label }: { label: string }) => {
	return (
		<Typography color="rgb(100, 100, 100)" sx={{ mt: 1 }}>
			{label}
		</Typography>
	);
};

const PropertyTextField = ({
	defaultValue,
	onSave,
}: {
	defaultValue: string;
	onSave: (value: string) => void;
}) => {
	const [editingValue, setEditingValue] = useState<string>(defaultValue);

	return (
		<Box
			component="input"
			value={editingValue}
			onChange={(e) => setEditingValue(e.target.value)}
			onBlur={() => {
				onSave(editingValue);
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter") {
					onSave(editingValue);
					(e.target as HTMLInputElement).blur();
				}
			}}
			sx={{
				padding: "4px",
				width: "100%",
				background: "rgb(220, 220, 220)",
				border: "1px solid rgb(220, 220, 220)",
				transition: "all .2s ease",
				"&:focus": {
					color: (th) => th.palette.primary.main,
					background: (th) => alpha(th.palette.primary.main, 0.1),
					borderColor: (th) => th.palette.primary.main,
				},
			}}
		/>
	);
};

const ProjectPropertiesPage = () => {
	const { project, changeProjectName, changeProjectAuthor } = useProjectContext();

	return (
		<Page pageId={PROJECT_PROPERTIES_PAGE_ID} sx={{ justifyContent: "center", alignItems: "start" }}>
			<Box
				sx={{
					padding: "2rem 1rem",
					width: 800,
				}}
			>
				<Typography variant="h2">Propriétés du projet</Typography>
				<Divider sx={{ borderColor: "black", borderWidth: "2px", my: 1 }} />
				<Grid container spacing={2} sx={{ mb: 2 }}>
					<Grid size={{ xs: 12, sm: 6 }}>
						<PropertyLabel label="Nom" />
						<PropertyTextField defaultValue={project!.name} onSave={changeProjectName} />
					</Grid>
					<Grid size={{ xs: 12, sm: 6 }}>
						<PropertyLabel label="Auteur" />
						<PropertyTextField
							defaultValue={project!.author ?? ""}
							onSave={changeProjectAuthor}
						/>
					</Grid>
				</Grid>
			</Box>
		</Page>
	);
};

export default ProjectPropertiesPage;
