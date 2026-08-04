"use client";

import Project from "@/schemas/project/project.schema";
import { useProjectStore } from "./ProjectContext";
import { Delete as DeleteIcon } from "@mui/icons-material";
import {
	Box,
	CircularProgress,
	IconButton,
	List,
	ListItem,
	ListItemButton,
	ListItemText,
	Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

interface ProjectsListProps {
	reloadKey: any;
	onProjectClick: (projectId: string) => void;
}

export default function ProjectsList({ reloadKey, onProjectClick }: ProjectsListProps) {
	const [projects, setProjects] = useState<Project[]>([]);
	const [loading, setLoading] = useState(true);
	const projectRepository = useProjectStore((state) => state.projectRepository);

	useEffect(() => {
		setLoading(true);
		try {
			const loadedProjects = projectRepository.list();
			setProjects(loadedProjects);
		} catch (error) {
			console.error("Erreur lors du chargement des projets:", error);
		} finally {
			setLoading(false);
		}
	}, [reloadKey, projectRepository]);

	const handleDeleteProject = (event: React.MouseEvent, projectId: string) => {
		event.stopPropagation();
		if (confirm("Êtes-vous sûr de vouloir supprimer ce projet ?")) {
			projectRepository.delete(projectId);
			setProjects((prevProjects) => prevProjects.filter((p) => p.id !== projectId));
		}
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
					{projects.map((project) => (
						<ListItem
							key={project.id}
							disablePadding
							secondaryAction={
								<IconButton
									edge="end"
									aria-label="delete"
									onClick={(e) => handleDeleteProject(e, project.id)}
								>
									<DeleteIcon />
								</IconButton>
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
