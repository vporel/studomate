"use client";

import HybridProjectRepository from "@/persistence/repositories/hybrid.project.repository";
import Project from "@/schemas/project/project.schema";
import { useAuthStore } from "@/ui/stores/auth/auth.store";
import { useProjectStore } from "./ProjectContext";
import {
	CloudDownload as CloudDownloadIcon,
	CloudUpload as CloudUploadIcon,
	Delete as DeleteIcon,
} from "@mui/icons-material";
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

interface ProjectsListProps {
	reloadKey: any;
	onProjectClick: (projectId: string) => void;
}

type ProjectsTab = "local" | "cloud";

export default function ProjectsList({ reloadKey, onProjectClick }: ProjectsListProps) {
	const [projects, setProjects] = useState<Project[]>([]);
	const [loading, setLoading] = useState(true);
	const [tab, setTab] = useState<ProjectsTab>("local");
	const projectRepository = useProjectStore((state) => state.projectRepository) as HybridProjectRepository;
	const authenticated = useAuthStore((state) => !!state.user);
	const setAuthModalVisible = useAuthStore((state) => state.setAuthModalVisible);

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
		() => projects.filter((project) => projectRepository.locationOf(project.id) === tab),
		[projects, projectRepository, tab],
	);

	const handleDeleteProject = async (event: React.MouseEvent, projectId: string) => {
		event.stopPropagation();
		if (confirm("Êtes-vous sûr de vouloir supprimer ce projet ?")) {
			await projectRepository.delete(projectId);
			setProjects((prevProjects) => prevProjects.filter((p) => p.id !== projectId));
		}
	};

	const handleMoveToCloud = async (event: React.MouseEvent, project: Project) => {
		event.stopPropagation();
		const result = await projectRepository.moveToCloud(project);
		if (!result.ok) {
			alert("Le projet n'a pas pu être envoyé dans le cloud. Vérifiez votre connexion.");
			return;
		}
		await reload();
	};

	const handleMoveToLocal = async (event: React.MouseEvent, project: Project) => {
		event.stopPropagation();
		const result = await projectRepository.moveToLocal(project);
		if (!result.ok) {
			alert("Le projet n'a pas pu être rapatrié en local. Vérifiez l'espace disponible.");
			return;
		}
		await reload();
	};

	return (
		<Box>
			<Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 1 }}>
				<Tab label="Local" value="local" />
				<Tab label="Cloud" value="cloud" />
			</Tabs>

			{tab === "cloud" && !authenticated ? (
				<Box display="flex" justifyContent="center" py={4}>
					<Button onClick={() => setAuthModalVisible(true)}>Se connecter</Button>
				</Box>
			) : loading ? (
				<Box display="flex" justifyContent="center" alignItems="center" py={4}>
					<CircularProgress />
				</Box>
			) : visibleProjects.length === 0 ? (
				<Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
					Aucun projet enregistré
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
										<Tooltip title="Envoyer vers le cloud">
											<IconButton
												edge="end"
												aria-label="envoyer vers le cloud"
												onClick={(e) => void handleMoveToCloud(e, project)}
											>
												<CloudUploadIcon />
											</IconButton>
										</Tooltip>
									)}
									{tab === "cloud" && (
										<Tooltip title="Rapatrier en local">
											<IconButton
												edge="end"
												aria-label="rapatrier en local"
												onClick={(e) => void handleMoveToLocal(e, project)}
											>
												<CloudDownloadIcon />
											</IconButton>
										</Tooltip>
									)}
									<IconButton
										edge="end"
										aria-label="delete"
										onClick={(e) => void handleDeleteProject(e, project.id)}
									>
										<DeleteIcon />
									</IconButton>
								</Box>
							}
						>
							<ListItemButton onClick={() => onProjectClick(project.id)}>
								<ListItemText
									primary={project.name}
									secondary={`Dernière modification : ${project.lastModificationDate.toLocaleDateString()} à ${project.lastModificationDate.toLocaleTimeString()}`}
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
