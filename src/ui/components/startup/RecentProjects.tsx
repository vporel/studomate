"use client";

import type HybridProjectRepository from "@/persistence/repositories/hybrid.project.repository";
import Project from "@/schemas/project/project.schema";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useLocaleContext } from "@/ui/i18n/LocaleProvider";
import { useT } from "@/ui/i18n/useT";
import CloudOutlinedIcon from "@mui/icons-material/CloudOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import {
	Box,
	Button,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	Paper,
	Typography,
} from "@mui/material";
import { formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { useShallow } from "zustand/shallow";
import { projectContents } from "./project-contents";
import ProjectContentsLine from "./ProjectContentsLine";

export default function RecentProjects({
	projects,
	total,
	cloudUnavailable = false,
}: {
	projects: Project[];
	total: number;
	cloudUnavailable?: boolean;
}) {
	const t = useT("chrome.startup");
	const tList = useT("projects.list");
	const { locale } = useLocaleContext();
	const { projectRepository, lifecycleManager, setOpenModalVisible } =
		useProjectStore(
			useShallow((state) => ({
				projectRepository: state.projectRepository as HybridProjectRepository,
				lifecycleManager: state.lifecycleManager,
				setOpenModalVisible: state.setOpenModalVisible,
			})),
		);

	return (
		<Box component="section">
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					mb: 1,
				}}
			>
				<Typography component="h2" variant="overline" color="text.secondary">
					{t("recentProjects")}
				</Typography>
				{total > projects.length && (
					<Button size="small" onClick={() => setOpenModalVisible(true)}>
						{t("allProjects", { count: total })}
					</Button>
				)}
			</Box>
			{cloudUnavailable && (
				<Typography variant="body2" color="warning.main" sx={{ mb: 1 }}>
					{tList("cloudUnavailable")}
				</Typography>
			)}
			<Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
				{projects.length === 0 && (
					<Typography color="text.secondary" sx={{ py: 3, px: 2.5 }}>
						{t("noProjects")}
					</Typography>
				)}
				{projects.map((project, index) => (
					<ListItemButton
						key={project.id}
						divider={index < projects.length - 1}
						onClick={() => void lifecycleManager.openProject(project.id)}
						sx={{ py: 1.5, px: 2.5, gap: 2 }}
					>
						<ListItemIcon sx={{ minWidth: 0 }}>
							<DescriptionOutlinedIcon color="primary" />
						</ListItemIcon>
						<ListItemText
							primary={project.name}
							secondary={
								<ProjectContentsLine
									component="span"
									contents={projectContents(project)}
								/>
							}
							slotProps={{
								primary: { fontWeight: 500, noWrap: true },
							}}
							sx={{ my: 0, minWidth: 0 }}
						/>
						<Box
							sx={{
								display: "flex",
								alignItems: "center",
								gap: 1,
								color: "text.secondary",
								flexShrink: 0,
							}}
						>
							{projectRepository.locationOf(project.id) === "cloud" && (
								<CloudOutlinedIcon
									fontSize="small"
									titleAccess={t("cloudProject")}
								/>
							)}
							<Typography variant="body2">
								{t("modifiedAgo", {
									ago: formatDistanceToNow(project.lastModificationDate, {
										addSuffix: true,
										locale: locale === "en" ? enUS : fr,
									}),
								})}
							</Typography>
						</Box>
					</ListItemButton>
				))}
			</Paper>
		</Box>
	);
}
