"use client";

import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { Dialect } from "@/expression-language/dialect.enum";
import { useT } from "@/ui/i18n/useT";
import { Box, Grid, MenuItem, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "../projects/ProjectContext";
import Page from "./Page";
import { PROJECT_PROPERTIES_PAGE_ID } from "@/ui/stores/project/pages-data";

/** Fond blanc des champs, la page étant posée sur un gris clair. */
const whiteFieldSx = { "& .MuiInputBase-root": { backgroundColor: "#fff" } };

const PropertyTextField = ({
	label,
	value,
	onSave,
	disabled,
	helperText,
}: {
	label: string;
	value: string;
	onSave: (value: string) => void;
	disabled?: boolean;
	helperText?: string;
}) => {
	const [editingValue, setEditingValue] = useState<string>(value);
	useEffect(() => setEditingValue(value), [value]);

	return (
		<TextField
			label={label}
			size="small"
			fullWidth
			disabled={disabled}
			helperText={helperText}
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
	disabled,
}: {
	value: string;
	onSave: (value: string) => void;
	disabled: boolean;
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
			disabled={disabled}
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
		designing,
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
			designing: state.mode === ProjectMode.DESIGN,
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
							disabled={!designing}
							helperText={designing ? undefined : t("readOnlyInSimulation")}
						/>
					</Grid>
					<Grid size={{ xs: 12, sm: 6 }}>
						<PropertyTextField
							label={t("author")}
							value={author}
							onSave={changeProjectAuthor}
							disabled={!designing}
						/>
					</Grid>
					<Grid size={{ xs: 12, sm: 6 }}>
						<TextField
							select
							label={t("expressionLanguage")}
							fullWidth
							size="small"
							disabled={!designing}
							sx={whiteFieldSx}
							slotProps={{ inputLabel: { shrink: true } }}
							value={dialect}
							onChange={(e) => changeProjectDialect(e.target.value as Dialect)}
							helperText={
								designing
									? t("expressionLanguageHelper")
									: t("readOnlyInSimulation")
							}
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
						disabled={!designing}
					/>
				</Box>
			</Box>
		</Page>
	);
};

export default ProjectPropertiesPage;
