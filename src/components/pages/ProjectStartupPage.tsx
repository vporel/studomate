"use client";

import { APP_NAME, APP_SLOGAN } from "@/constants";
import { Box, Grid, ListItemIcon, ListItemText, MenuItem, Typography } from "@mui/material";
import InclinedAccountTree from "../icons/InclinedAccountTree";
import { useProjectContext } from "../projects/ProjectContext";
import Page from "./Page";
import { ProjectStartPageData } from "./context/pages-data";

export const PROJECT_STARTUP_PAGE_ID = "project-startup";
export const PROJECT_STARTUP_PAGE_DATA: ProjectStartPageData = {
	type: "project-startup",
	title: "Démarrage",
};

const ProjectStartupPage = ({ pageId }: { pageId: string }) => {
	const { newGrafcet } = useProjectContext();

	return (
		<Page pageId={pageId} sx={{ justifyContent: "center", alignItems: "start" }}>
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
					<Grid size={{ xs: 6, sm: 6 }}>
						<Typography variant="h4" color="rgb(80, 80, 80)" sx={{ marginBottom: "0.5rem" }}>
							Démarrer
						</Typography>
						<MenuItem
							onClick={() => {
								newGrafcet("Sans titre", { type: "A4", orientation: "portrait" });
							}}
						>
							<ListItemIcon>
								<InclinedAccountTree sx={{ color: (th) => th.palette.primary.main }} />
							</ListItemIcon>
							<ListItemText sx={{ color: (th) => th.palette.primary.main }}>
								Nouveau grafcet
							</ListItemText>
						</MenuItem>
					</Grid>
				</Grid>
			</Box>
		</Page>
	);
};

export default ProjectStartupPage;
