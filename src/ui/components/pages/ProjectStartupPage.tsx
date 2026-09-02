"use client";

import { APP_NAME, APP_SLOGAN } from "@/app-info";
import { PageData } from "@/ui/stores/project/project.store";
import AddIcon from "@mui/icons-material/Add";
import {
	Box,
	Divider,
	Grid,
	ListItemIcon,
	ListItemText,
	MenuItem,
	Typography,
} from "@mui/material";
import InclinedAccountTree from "../icons/InclinedAccountTree";
import LadderIcon from "../icons/LadderIcon";
import VariablesIcon from "../icons/VariablesIcon";
import { useProjectStore } from "../projects/ProjectContext";
import useProjectPrograms from "../projects/useProjectPrograms";
import { useT } from "@/ui/i18n/useT";
import Page from "./Page";
import { usePageTitle } from "./usePageTitle";
import { getVariablesPageData, VariablesPageId } from "./VariablesPage";

export const PROJECT_STARTUP_PAGE_ID = "project-startup";
export const PROJECT_STARTUP_PAGE_DATA: PageData = {
	id: PROJECT_STARTUP_PAGE_ID,
	type: "project-startup",
	title: "Démarrage",
};

function VariblesPagesList() {
	const t = useT("pages.startup");
	const pageTitle = usePageTitle();
	const pagedsIds: VariablesPageId[] = [
		"input-variables",
		"output-variables",
		"memory-variables",
	];
	const pagesData = pagedsIds.map((id) => getVariablesPageData(id));
	const pagesManager = useProjectStore((state) => state.pagesManager);

	return (
		<>
			<Typography variant="h4" color="rgb(80, 80, 80)" sx={{ marginBottom: 2 }}>
				{t("variables")}
			</Typography>
			{pagesData.map((pageData) => (
				<MenuItem
					key={pageData.id}
					onClick={() =>
						pagesManager.openPage({
							id: pageData.id,
							title: pageData.title,
							type: "variables",
						})
					}
				>
					<ListItemIcon>
						<VariablesIcon />
					</ListItemIcon>
					<ListItemText>
						{pageTitle({
							id: pageData.id,
							type: "variables",
							title: pageData.title,
						})}
					</ListItemText>
				</MenuItem>
			))}
		</>
	);
}

function ProgramsList() {
	const t = useT("pages.startup");
	const programs = useProjectPrograms();
	const pagesManager = useProjectStore((state) => state.pagesManager);

	return (
		<>
			<Typography
				variant="h4"
				color="rgb(80, 80, 80)"
				sx={{ marginBottom: 1, mt: 2 }}
			>
				{t("programs")}
			</Typography>
			{programs.length === 0 && (
				<Typography color="rgb(80, 80, 80)">
					{t("noPrograms")}
				</Typography>
			)}
			{programs.map((program) => (
				<MenuItem
					key={program.id}
					onClick={() =>
						pagesManager.openPage({
							id: program.id,
							title: program.name,
							type: program.type,
						})
					}
				>
					<ListItemIcon>
						{program.type === "grafcet" ? (
							<InclinedAccountTree />
						) : (
							<LadderIcon />
						)}
					</ListItemIcon>
					<ListItemText>{program.name}</ListItemText>
				</MenuItem>
			))}
		</>
	);
}

function Actions() {
	const t = useT("pages.startup");
	const grafcetsManager = useProjectStore((state) => state.grafcetsManager);
	const laddersManager = useProjectStore((state) => state.laddersManager);
	return (
		<>
			<Typography variant="h4" color="rgb(80, 80, 80)" sx={{ marginBottom: 1 }}>
				{t("actions")}
			</Typography>
			<MenuItem
				onClick={() => {
					grafcetsManager.newGrafcet();
				}}
			>
				<ListItemIcon>
					<AddIcon sx={{ color: (th) => th.palette.primary.main }} />
				</ListItemIcon>
				<ListItemText sx={{ color: (th) => th.palette.primary.main }}>
					{t("newGrafcet")}
				</ListItemText>
			</MenuItem>
			<MenuItem
				onClick={() => {
					laddersManager.newLadder();
				}}
			>
				<ListItemIcon>
					<AddIcon sx={{ color: (th) => th.palette.primary.main }} />
				</ListItemIcon>
				<ListItemText sx={{ color: (th) => th.palette.primary.main }}>
					{t("newLadder")}
				</ListItemText>
			</MenuItem>
		</>
	);
}

const ProjectStartupPage = () => {
	return (
		<Page
			pageId={PROJECT_STARTUP_PAGE_ID}
			sx={{ justifyContent: "center", alignItems: "start" }}
		>
			<Box
				sx={{
					padding: "4rem 1rem",
					width: 800,
				}}
			>
				<Typography variant="h1">{APP_NAME}</Typography>
				<Typography variant="h3" color="gray">
					{APP_SLOGAN}
				</Typography>
				<Grid container spacing={2} sx={{ marginTop: "2rem" }}>
					<Grid size={{ xs: 12, sm: 6 }}>
						<VariblesPagesList />
						<Divider />
						<ProgramsList />
					</Grid>
					<Grid size={{ xs: 12, sm: 6 }}>
						<Actions />
					</Grid>
				</Grid>
			</Box>
		</Page>
	);
};

export default ProjectStartupPage;
