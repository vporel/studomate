"use client";

import { PageData } from "@/ui/stores/project/project.store";
import { Dialect } from "@/expression-language/dialect.enum";
import { useT } from "@/ui/i18n/useT";
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

/** Fond blanc des champs, la page étant posée sur un gris clair. */
const whiteFieldSx = { "& .MuiInputBase-root": { backgroundColor: "#fff" } };

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
			sx={whiteFieldSx}
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

const ExerciseStatementField = ({
	value,
	onSave,
}: {
	value: string;
	onSave: (value: string) => void;
}) => {
	const t = useT("pages.properties");
	const [editingValue, setEditingValue] = useState<string>(value);
	useEffect(() => setEditingValue(value), [value]);

	return (
		<TextField
			label={t("exerciseField")}
			size="small"
			fullWidth
			multiline
			minRows={6}
			maxRows={20}
			sx={whiteFieldSx}
			slotProps={{ inputLabel: { shrink: true } }}
			value={editingValue}
			onChange={(e) => setEditingValue(e.target.value)}
			onBlur={() => onSave(editingValue)}
			helperText={t("exerciseFieldHelper")}
		/>
	);
};

const ProjectPropertiesPage = () => {
	const t = useT("pages.properties");
	const {
		name,
		author,
		dialect,
		exerciseStatement,
		changeProjectName,
		changeProjectAuthor,
		changeProjectDialect,
		changeExerciseStatement,
	} = useProjectStore(
		useShallow((state) => ({
			name: state.project?.name ?? "",
			author: state.project?.author ?? "",
			dialect: state.project?.dialect ?? Dialect.FR,
			exerciseStatement: state.project?.exercise?.statement ?? "",
			changeProjectName: state.setProjectName,
			changeProjectAuthor: state.setProjectAuthor,
			changeProjectDialect: state.setProjectDialect,
			changeExerciseStatement: state.setExerciseStatement,
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
				<Typography variant="h2">{t("heading")}</Typography>
				<Grid container spacing={2} sx={{ mt: 3, mb: 2 }}>
					<Grid size={{ xs: 12, sm: 6 }}>
						<PropertyTextField
							label={t("name")}
							value={name}
							onSave={changeProjectName}
						/>
					</Grid>
					<Grid size={{ xs: 12, sm: 6 }}>
						<PropertyTextField
							label={t("author")}
							value={author}
							onSave={changeProjectAuthor}
						/>
					</Grid>
					<Grid size={{ xs: 12, sm: 6 }}>
						<TextField
							select
							label={t("expressionLanguage")}
							fullWidth
							size="small"
							sx={whiteFieldSx}
							slotProps={{ inputLabel: { shrink: true } }}
							value={dialect}
							onChange={(e) =>
								changeProjectDialect(Number(e.target.value) as Dialect)
							}
							helperText={t("expressionLanguageHelper")}
						>
							<MenuItem value={Dialect.FR}>{t("dialectFr")}</MenuItem>
							<MenuItem value={Dialect.EN}>{t("dialectEn")}</MenuItem>
						</TextField>
					</Grid>
				</Grid>
				<Box sx={{ mt: 2 }}>
					<ExerciseStatementField
						value={exerciseStatement}
						onSave={changeExerciseStatement}
					/>
				</Box>
			</Box>
		</Page>
	);
};

export default ProjectPropertiesPage;
