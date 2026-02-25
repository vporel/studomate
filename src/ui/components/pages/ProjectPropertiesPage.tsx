"use client";

import { PageData } from "@/ui/stores/project/project-store-types";
import { alpha, Box, Grid, Typography } from "@mui/material";
import { useState } from "react";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "../projects/ProjectContext";
import Page from "./Page";

export const PROJECT_PROPERTIES_PAGE_ID = "project-properties";
export const PROJECT_PROPERTIES_PAGE_DATA: PageData = {
	id: PROJECT_PROPERTIES_PAGE_ID,
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
	const { name, author, changeProjectName, changeProjectAuthor } = useProjectStore(
		useShallow((state) => ({
			name: state.project?.name ?? "",
			author: state.project?.author ?? "",
			changeProjectName: state.setProjectName,
			changeProjectAuthor: state.setProjectAuthor,
		})),
	);

	return (
		<Page pageId={PROJECT_PROPERTIES_PAGE_ID} sx={{ justifyContent: "center", alignItems: "start" }}>
			<Box
				sx={{
					padding: "2rem 1rem",
					width: 800,
				}}
			>
				<Typography variant="h2">Propriétés du projet</Typography>
				<Grid container spacing={2} sx={{ mt: 3, mb: 2 }}>
					<Grid size={{ xs: 12, sm: 6 }}>
						<PropertyLabel label="Nom" />
						<PropertyTextField defaultValue={name} onSave={changeProjectName} />
					</Grid>
					<Grid size={{ xs: 12, sm: 6 }}>
						<PropertyLabel label="Auteur" />
						<PropertyTextField defaultValue={author} onSave={changeProjectAuthor} />
					</Grid>
				</Grid>
			</Box>
		</Page>
	);
};

export default ProjectPropertiesPage;
