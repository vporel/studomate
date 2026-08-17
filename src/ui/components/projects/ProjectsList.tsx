"use client";

import HybridProjectRepository from "@/persistence/repositories/hybrid.project.repository";
import Project from "@/schemas/project/project.schema";
import { useAuthStore } from "@/ui/stores/auth/auth.store";
import { useProjectStore } from "./ProjectContext";
import { CloudUpload as CloudUploadIcon, Delete as DeleteIcon } from "@mui/icons-material";
import {
	Box,
	CircularProgress,
	IconButton,
	List,
	ListItem,
	ListItemButton,
	ListItemText,
	Tooltip,
	Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";

interface ProjectsListProps {
	reloadKey: any;
	onProjectClick: (projectId: string) => void;
}

export default function ProjectsList({ reloadKey, onProjectClick }: ProjectsListProps) {
	const [projects, setProjects] = useState<Project[]>([]);
	const [loading, setLoading] = useState(true);
	const projectRepository = useProjectStore((state) => state.projectRepository) as HybridProjectRepository;
	const authenticated = useAuthStore((state) => !!state.user);

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

	return (
		<Box>
			{loading ? (
				<Box display="flex" justifyContent="center" alignItems="center" py={4}>
					<CircularProgress />
				</Box>
			) : projects.length === 0 ? (
				<Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
					Aucun projet enregistré
				</Typography>
			) : (
				<List>
					{projects.map((project) => {
						const isCloud = projectRepository.locationOf(project.id) === "cloud";
						return (
							<ListItem
								key={project.id}
								disablePadding
								secondaryAction={
									<Box sx={{ display: "flex", alignItems: "center" }}>
										{!isCloud && authenticated && (
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
										primary={`${project.name}${isCloud ? " ☁" : ""}`}
										secondary={`Dernière modification : ${project.lastModificationDate.toLocaleDateString()} à ${project.lastModificationDate.toLocaleTimeString()}`}
										slotProps={{
											secondary: {
												sx: { fontSize: "0.8rem" },
											},
										}}
									/>
								</ListItemButton>
							</ListItem>
						);
					})}
				</List>
			)}
		</Box>
	);
}
