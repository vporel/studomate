"use client";

import { APP_NAME, APP_SLOGAN } from "@/app-info";
import AddIcon from "@mui/icons-material/Add";
import MemoryIcon from "@mui/icons-material/Memory";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
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
import { VARIABLES_PAGE_IDS } from "@/ui/stores/project/variables-pages";
import {
	HARDWARE_CONFIGURATION_PAGE_DATA,
	SCENE3D_CONFIGURATION_PAGE_DATA,
	getVariablesPageData,
} from "@/ui/stores/project/pages-data";
import { PROJECT_STARTUP_PAGE_ID } from "@/ui/stores/project/pages-data";

function VariblesPagesList() {
	const t = useT("pages.startup");
	const pageTitle = usePageTitle();
	const pagesData = VARIABLES_PAGE_IDS.map((id) => getVariablesPageData(id));
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
				<Typography color="rgb(80, 80, 80)">{t("noPrograms")}</Typography>
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

function HardwareAction() {
	const t = useT("pages.startup");
	const pagesManager = useProjectStore((state) => state.pagesManager);
	return (
		<MenuItem
			onClick={() => pagesManager.openPage(HARDWARE_CONFIGURATION_PAGE_DATA)}
		>
			<ListItemIcon>
				<MemoryIcon />
			</ListItemIcon>
			<ListItemText>{t("hardwareConfiguration")}</ListItemText>
		</MenuItem>
	);
}

function Scene3dAction() {
	const t = useT("pages.startup");
	const pagesManager = useProjectStore((state) => state.pagesManager);
	return (
		<MenuItem
			onClick={() => pagesManager.openPage(SCENE3D_CONFIGURATION_PAGE_DATA)}
		>
			<ListItemIcon>
				<ViewInArIcon />
			</ListItemIcon>
			<ListItemText>{t("scene3dConfiguration")}</ListItemText>
		</MenuItem>
	);
}

function StartupAction({
	label,
	onClick,
}: {
	label: string;
	onClick: () => void;
}) {
	return (
		<MenuItem onClick={onClick}>
			<ListItemIcon>
				<AddIcon sx={{ color: (th) => th.palette.primary.main }} />
			</ListItemIcon>
			<ListItemText sx={{ color: (th) => th.palette.primary.main }}>
				{label}
			</ListItemText>
		</MenuItem>
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
			<HardwareAction />
			<Scene3dAction />
			<Divider sx={{ my: 1 }} />
			<StartupAction
				label={t("newGrafcet")}
				onClick={() => grafcetsManager.newGrafcet()}
			/>
			<StartupAction
				label={t("newLadder")}
				onClick={() => laddersManager.newLadder()}
			/>
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
