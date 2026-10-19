"use client";

import { useT } from "@/ui/i18n/useT";
import AddIcon from "@mui/icons-material/Add";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import { Box, Button, Skeleton, Typography } from "@mui/material";
import { useShallow } from "zustand/shallow";
import ProfilePromptModal from "./profile/ProfilePromptModal";
import { useProjectStore } from "./projects/ProjectContext";
import ExampleCard, { type ExampleVariant } from "./startup/ExampleCard";
import FeaturedExample from "./startup/FeaturedExample";
import RecentProjects from "./startup/RecentProjects";
import StartupAside from "./startup/StartupAside";
import StartupFooter from "./startup/StartupFooter";
import StartupHeader from "./startup/StartupHeader";
import {
	listStartupExamples,
	type StartupExample,
} from "./startup/startup-examples";
import useRecentProjects from "./startup/useRecentProjects";

const RECENT_PROJECTS_LIMIT = 5;
const EXAMPLE_GRID_SIZE = 3;

const examples = listStartupExamples();

const AppStartup = () => {
	const t = useT("chrome.startup");
	const { lifecycleManager, setOpenModalVisible, setNewProjectModalVisible } =
		useProjectStore(
			useShallow((state) => ({
				lifecycleManager: state.lifecycleManager,
				setOpenModalVisible: state.setOpenModalVisible,
				setNewProjectModalVisible: state.setNewProjectModalVisible,
			})),
		);
	const recent = useRecentProjects(RECENT_PROJECTS_LIMIT);
	const returning = !recent.loading && recent.returning;

	const openExample = (example: StartupExample, variant: ExampleVariant) =>
		void lifecycleManager.newProjectFromTemplate(example.id, variant);

	const [featured, ...others] = examples;
	const gridExamples = (returning ? examples : others).slice(
		0,
		EXAMPLE_GRID_SIZE,
	);

	return (
		<Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
			<ProfilePromptModal />
			<Box
				sx={{
					maxWidth: 1240,
					mx: "auto",
					px: 6,
					py: 5,
					display: "grid",
					gridTemplateColumns: "minmax(0, 1fr) 260px",
					columnGap: 6,
					alignItems: "start",
				}}
			>
				<Box component="main">
					<StartupHeader />

					<Box
						sx={{
							display: "flex",
							alignItems: "flex-end",
							justifyContent: "space-between",
							gap: 3,
							mt: 6,
							mb: 3,
						}}
					>
						<Box>
							<Typography
								component="h1"
								sx={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1.2 }}
							>
								{recent.loading ? (
									<Skeleton width={280} />
								) : returning ? (
									t("resumeTitle")
								) : (
									t("welcomeTitle")
								)}
							</Typography>
							{!recent.loading && !returning && (
								<Typography color="text.secondary" mt={1}>
									{t("welcomeSubtitle")}
								</Typography>
							)}
						</Box>
						<Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
							<Button
								variant={returning ? "contained" : "outlined"}
								disableElevation
								startIcon={<AddIcon />}
								onClick={() => setNewProjectModalVisible(true)}
							>
								{t("newProject")}
							</Button>
							<Button
								variant="outlined"
								startIcon={<FolderOpenOutlinedIcon />}
								onClick={() => setOpenModalVisible(true)}
							>
								{t("openProject")}
							</Button>
						</Box>
					</Box>

					{recent.loading ? (
						<Skeleton variant="rounded" height={340} />
					) : (
						<>
							{returning ? (
								<RecentProjects
									projects={recent.projects}
									total={recent.total}
									cloudUnavailable={recent.cloudUnavailable}
								/>
							) : (
								featured && (
									<FeaturedExample
										example={featured}
										onOpen={(variant) => openExample(featured, variant)}
									/>
								)
							)}

							<Box component="section" mt={5}>
								<Box
									sx={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										mb: 1,
									}}
								>
									<Typography
										component="h2"
										variant="overline"
										color="text.secondary"
									>
										{returning ? t("examplesTitle") : t("otherExamplesTitle")}
									</Typography>
									<Button
										size="small"
										onClick={() => setNewProjectModalVisible(true)}
									>
										{t("allTemplates")}
									</Button>
								</Box>
								<Box
									sx={{
										display: "grid",
										gridTemplateColumns: `repeat(${EXAMPLE_GRID_SIZE}, minmax(0, 1fr))`,
										gap: 2,
									}}
								>
									{gridExamples.map((example) => (
										<ExampleCard
											key={example.id}
											example={example}
											onOpen={(variant) => openExample(example, variant)}
										/>
									))}
								</Box>
							</Box>
						</>
					)}
					<StartupFooter />
				</Box>

				<StartupAside />
			</Box>
		</Box>
	);
};

export default AppStartup;
