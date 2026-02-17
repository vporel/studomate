"use client";

import { APP_NAME, APP_SLOGAN } from "@/constants";
import { DEFAULT_GRAFCET_FORMAT, DEFAULT_GRAFCET_NAME } from "@/schemas/grafcet/Grafcet.class";
import { PageData } from "@/stores/project/project-store-types";
import { Add as AddIcon } from "@mui/icons-material";
import { Box, Grid, ListItemIcon, ListItemText, MenuItem, Typography } from "@mui/material";
import { useShallow } from "zustand/shallow";
import InclinedAccountTree from "../icons/InclinedAccountTree";
import { useProjectStore } from "../projects/ProjectContext";
import Page from "./Page";

export const PROJECT_STARTUP_PAGE_ID = "project-startup";
export const PROJECT_STARTUP_PAGE_DATA: PageData = {
	id: PROJECT_STARTUP_PAGE_ID,
	type: "project-startup",
	title: "Démarrage",
};

const ProjectStartupPage = () => {
	const newGrafcet = useProjectStore((state) => state.newGrafcet);
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
	const openPage = useProjectStore((state) => state.openPage);

	const grafcets: { id: string; name: string }[] = [];
	for (const id of grafcetsIds) {
		grafcets.push({ id, name: grafcetsNames[id] });
	}

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
						<Typography variant="h4" color="rgb(80, 80, 80)" sx={{ marginBottom: "0.5rem" }}>
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
							<ListItemText sx={{ color: (th) => th.palette.primary.main }}>
								Nouveau grafcet
							</ListItemText>
						</MenuItem>
					</Grid>
					{grafcetsIds.length > 0 && (
						<Grid size={{ xs: 12, sm: 6 }}>
							<Typography variant="h4" color="rgb(80, 80, 80)" sx={{ marginBottom: "0.5rem" }}>
								Vos grafcets
							</Typography>
							{grafcets &&
								Object.values(grafcets).map((grafcet) => (
									<MenuItem
										key={grafcet.id}
										onClick={() =>
											openPage({ id: grafcet.id, title: grafcet.name, type: "grafcet" })
										}
									>
										<ListItemIcon>
											<InclinedAccountTree />
										</ListItemIcon>
										<ListItemText>{grafcet.name}</ListItemText>
									</MenuItem>
								))}
						</Grid>
					)}
				</Grid>
			</Box>
		</Page>
	);
};

export default ProjectStartupPage;
