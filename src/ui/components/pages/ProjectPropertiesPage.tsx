"use client";

import { PageData } from "@/ui/stores/project/project.store";
import { Dialect } from "@/expression-language/dialect.enum";
import { Box, Grid, MenuItem, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "../projects/ProjectContext";
import Page from "./Page";

export const PROJECT_PROPERTIES_PAGE_ID = "project-properties";
export const PROJECT_PROPERTIES_PAGE_DATA: PageData = {
	id: PROJECT_PROPERTIES_PAGE_ID,
	type: "project-properties",
	title: "Propriétés du projet",
};

const PropertyTextField = ({
	label,
	value,
	onSave,
}: {
	label: string;
	value: string;
	onSave: (value: string) => void;
}) => {
	const [editingValue, setEditingValue] = useState<string>(value);
	useEffect(() => setEditingValue(value), [value]);

	return (
		<TextField
			label={label}
			size="small"
			fullWidth
			slotProps={{ inputLabel: { shrink: true } }}
			value={editingValue}
			onChange={(e) => setEditingValue(e.target.value)}
			onBlur={() => onSave(editingValue)}
			onKeyDown={(e) => {
				if (e.key === "Enter") {
					onSave(editingValue);
					(e.target as HTMLInputElement).blur();
				}
			}}
		/>
	);
};

const ProjectPropertiesPage = () => {
	const {
		name,
		author,
		dialect,
		changeProjectName,
		changeProjectAuthor,
		changeProjectDialect,
	} = useProjectStore(
		useShallow((state) => ({
			name: state.project?.name ?? "",
			author: state.project?.author ?? "",
			dialect: state.project?.dialect ?? Dialect.FR,
			changeProjectName: state.setProjectName,
			changeProjectAuthor: state.setProjectAuthor,
			changeProjectDialect: state.setProjectDialect,
		})),
	);

	return (
		<Page
			pageId={PROJECT_PROPERTIES_PAGE_ID}
			sx={{ justifyContent: "center", alignItems: "start" }}
		>
			<Box
				sx={{
					padding: "2rem 1rem",
					width: 800,
				}}
			>
				<Typography variant="h2">Propriétés du projet</Typography>
				<Grid container spacing={2} sx={{ mt: 3, mb: 2 }}>
					<Grid size={{ xs: 12, sm: 6 }}>
						<PropertyTextField
							label="Nom"
							value={name}
							onSave={changeProjectName}
						/>
					</Grid>
					<Grid size={{ xs: 12, sm: 6 }}>
						<PropertyTextField
							label="Auteur"
							value={author}
							onSave={changeProjectAuthor}
						/>
					</Grid>
					<Grid size={{ xs: 12, sm: 6 }}>
						<TextField
							select
							label="Langage des expressions"
							fullWidth
							size="small"
							slotProps={{ inputLabel: { shrink: true } }}
							value={dialect}
							onChange={(e) =>
								changeProjectDialect(Number(e.target.value) as Dialect)
							}
							helperText="Les expressions déjà écrites sont traduites automatiquement."
						>
							<MenuItem value={Dialect.FR}>
								Français — ET, OU, NON, VRAI, FAUX
							</MenuItem>
							<MenuItem value={Dialect.EN}>
								Anglais — AND, OR, NOT, TRUE, FALSE
							</MenuItem>
						</TextField>
					</Grid>
				</Grid>
			</Box>
		</Page>
	);
};

export default ProjectPropertiesPage;
