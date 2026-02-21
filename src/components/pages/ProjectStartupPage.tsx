"use client";

import { APP_NAME, APP_SLOGAN } from "@/constants";
import { DEFAULT_GRAFCET_FORMAT, DEFAULT_GRAFCET_NAME } from "@/schemas/grafcet/Grafcet.class";
import { PageData } from "@/stores/project/project-store-types";
import { Add as AddIcon, Segment as SegmentIcon } from "@mui/icons-material";
import { Box, Divider, Grid, ListItemIcon, ListItemText, MenuItem, Typography } from "@mui/material";
import { useShallow } from "zustand/shallow";
import InclinedAccountTree from "../icons/InclinedAccountTree";
import { useProjectStore } from "../projects/ProjectContext";
import Page from "./Page";
import { getVariablesPageData, VariablesPageId } from "./VariablesPage";

export const PROJECT_STARTUP_PAGE_ID = "project-startup";
export const PROJECT_STARTUP_PAGE_DATA: PageData = {
	id: PROJECT_STARTUP_PAGE_ID,
	type: "project-startup",
	title: "Démarrage",
};

function VariblesPagesList() {
	const pagedsIds: VariablesPageId[] = ["input-variables", "output-variables", "memory-variables"];
	const pagesData = pagedsIds.map((id) => getVariablesPageData(id));
	const openPage = useProjectStore((state) => state.openPage);

	return (
		<>
			<Typography variant="h4" color="rgb(80, 80, 80)" sx={{ marginBottom: 2 }}>
				Variables
			</Typography>
			{pagesData.map((pageData) => (
				<MenuItem
					key={pageData.id}
					onClick={() =>
						openPage({
							id: pageData.id,
							title: pageData.title,
							type: "variables",
						})
					}
				>
					<ListItemIcon>
						<SegmentIcon />
					</ListItemIcon>
					<ListItemText>{pageData.title}</ListItemText>
				</MenuItem>
			))}
		</>
	);
}

function GrafcetsList() {
	const grafcetsIds = useProjectStore(
		useShallow((state) => (state.project ? Object.keys(state.project.grafcets) : [])),
	);
	const grafcetsNames = useProjectStore(
		useShallow((state) =>
			state.project
				? Object.fromEntries(Object.values(state.project.grafcets).map((g) => [g.id, g.name]))
				: {},
		),
	);
	const grafcets: { id: string; name: string }[] = [];
	for (const id of grafcetsIds) {
		grafcets.push({ id, name: grafcetsNames[id] });
	}
	const openPage = useProjectStore((state) => state.openPage);

	return (
		<>
			<Typography variant="h4" color="rgb(80, 80, 80)" sx={{ marginBottom: 1, mt: 2 }}>
				Grafcets
			</Typography>
			{grafcets.length === 0 && (
				<Typography color="rgb(80, 80, 80)">Vous n&apos;avez pas encore de grafcet.</Typography>
			)}
			{grafcets &&
				Object.values(grafcets).map((grafcet) => (
					<MenuItem
						key={grafcet.id}
						onClick={() => openPage({ id: grafcet.id, title: grafcet.name, type: "grafcet" })}
					>
						<ListItemIcon>
							<InclinedAccountTree />
						</ListItemIcon>
						<ListItemText>{grafcet.name}</ListItemText>
					</MenuItem>
				))}
		</>
	);
}

function Actions() {
	const newGrafcet = useProjectStore((state) => state.newGrafcet);
	return (
		<>
			<Typography variant="h4" color="rgb(80, 80, 80)" sx={{ marginBottom: 1 }}>
				Actions
			</Typography>
			<MenuItem
				onClick={() => {
					newGrafcet(DEFAULT_GRAFCET_NAME, DEFAULT_GRAFCET_FORMAT);
				}}
			>
				<ListItemIcon>
					<AddIcon sx={{ color: (th) => th.palette.primary.main }} />
				</ListItemIcon>
				<ListItemText sx={{ color: (th) => th.palette.primary.main }}>Nouveau grafcet</ListItemText>
			</MenuItem>
		</>
	);
}

const ProjectStartupPage = () => {
	return (
		<Page pageId={PROJECT_STARTUP_PAGE_ID} sx={{ justifyContent: "center", alignItems: "start" }}>
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
						<GrafcetsList />
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
