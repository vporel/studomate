"use client";

import HybridProjectRepository from "@/persistence/repositories/hybrid.project.repository";
import { isSupabaseConfigured } from "@/persistence/repositories/supabase-client";
import Project from "@/schemas/project/project.schema";
import { clearPagesSession } from "@/ui/lib/pages-session-storage";
import { useAuthStore } from "@/ui/stores/auth/auth.store";
import { useProjectStore } from "./ProjectContext";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import {
	Box,
	Button,
	CircularProgress,
	IconButton,
	List,
	ListItem,
	ListItemButton,
	ListItemText,
	Tab,
	Tabs,
	Tooltip,
	Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useT } from "@/ui/i18n/useT";

interface ProjectsListProps {
	reloadKey: any;
	onProjectClick: (projectId: string) => void;
}

type ProjectsTab = "local" | "cloud";

export default function ProjectsList({
	reloadKey,
	onProjectClick,
}: ProjectsListProps) {
	const t = useT("projects.list");
	const tc = useT("projects.common");
	const [projects, setProjects] = useState<Project[]>([]);
	const [loading, setLoading] = useState(true);
	const [tab, setTab] = useState<ProjectsTab>("local");
	const projectRepository = useProjectStore(
		(state) => state.projectRepository,
	) as HybridProjectRepository;
	const authenticated = useAuthStore((state) => !!state.user);
	const setAuthModalVisible = useAuthStore(
		(state) => state.setAuthModalVisible,
	);

	const reload = useCallback(async () => {
		setLoading(true);
		try {
			const loadedProjects = await projectRepository.list();
			setProjects(loadedProjects);
		} catch (error) {
			console.error("Erreur lors du chargement des projets:", error);
		} finally {
			setLoading(false);
		}
	}, [projectRepository]);

	useEffect(() => {
		void reload();
	}, [reloadKey, reload]);

	const visibleProjects = useMemo(
		() =>
			projects.filter(
				(project) => projectRepository.locationOf(project.id) === tab,
			),
		[projects, projectRepository, tab],
	);

	const handleDeleteProject = async (
		event: React.MouseEvent,
		projectId: string,
	) => {
		event.stopPropagation();
		if (confirm(t("confirmDelete"))) {
			await projectRepository.delete(projectId);
			clearPagesSession(projectId);
			setProjects((prevProjects) =>
				prevProjects.filter((p) => p.id !== projectId),
			);
		}
	};

	const handleMoveToCloud = async (
		event: React.MouseEvent,
		project: Project,
	) => {
		event.stopPropagation();
		const result = await projectRepository.moveToCloud(project);
		if (!result.ok) {
			alert(
				result.reason === "conflict"
					? t("moveToCloudConflict")
					: t("moveToCloudFailed"),
			);
			return;
		}
		await reload();
	};

	const handleMoveToLocal = async (
		event: React.MouseEvent,
		project: Project,
	) => {
		event.stopPropagation();
		const result = await projectRepository.moveToLocal(project);
		if (!result.ok) {
			alert(
				t("moveToLocalFailed"),
			);
			return;
		}
		await reload();
	};

	return (
		<Box>
			{isSupabaseConfigured && (
				<Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 1 }}>
					<Tab label={t("tabLocal")} value="local" />
					<Tab label={t("tabCloud")} value="cloud" />
				</Tabs>
			)}

			{tab === "cloud" && !authenticated ? (
				<Box display="flex" justifyContent="center" py={4}>
					<Button onClick={() => setAuthModalVisible(true)}>
						{tc("login")}
					</Button>
				</Box>
			) : loading ? (
				<Box display="flex" justifyContent="center" alignItems="center" py={4}>
					<CircularProgress />
				</Box>
			) : visibleProjects.length === 0 ? (
				<Typography
					variant="body1"
					color="text.secondary"
					textAlign="center"
					py={4}
				>
					{t("empty")}
				</Typography>
			) : (
				<List>
					{visibleProjects.map((project) => (
						<ListItem
							key={project.id}
							disablePadding
							secondaryAction={
								<Box sx={{ display: "flex", alignItems: "center" }}>
									{tab === "local" && authenticated && (
										<Tooltip title={t("sendToCloud")}>
											<IconButton
												edge="end"
												aria-label={t("sendToCloudAria")}
												onClick={(e) => void handleMoveToCloud(e, project)}
											>
												<CloudUploadIcon />
											</IconButton>
										</Tooltip>
									)}
									{tab === "cloud" && (
										<Tooltip title={t("bringLocal")}>
											<IconButton
												edge="end"
												aria-label={t("bringLocalAria")}
												onClick={(e) => void handleMoveToLocal(e, project)}
											>
												<CloudDownloadIcon />
											</IconButton>
										</Tooltip>
									)}
									<Tooltip title={t("delete")}>
										<IconButton
											edge="end"
											aria-label="delete"
											onClick={(e) => void handleDeleteProject(e, project.id)}
										>
											<DeleteIcon />
										</IconButton>
									</Tooltip>
								</Box>
							}
						>
							<ListItemButton onClick={() => onProjectClick(project.id)}>
								<ListItemText
									primary={project.name}
									secondary={t("lastModified", { date: project.lastModificationDate.toLocaleDateString(), time: project.lastModificationDate.toLocaleTimeString() })}
									slotProps={{
										secondary: {
											sx: { fontSize: "0.8rem" },
										},
									}}
								/>
							</ListItemButton>
						</ListItem>
					))}
				</List>
			)}
		</Box>
	);
}
