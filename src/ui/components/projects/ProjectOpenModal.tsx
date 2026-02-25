"use client";

import Project from "@/schemas/project/Project.class";
import { openFileDialog, openFileViaInput, readFile } from "@/ui/lib/file-system";
import CustomModal from "@/ui/lib/mui/CustomModal";
import { localStorageSaveProject } from "@/ui/local-storage/projects";
import { Box, Button, Divider } from "@mui/material";
import { useCallback } from "react";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "./ProjectContext";
import ProjectsList from "./ProjectsList";

export default function ProjectOpenModal() {
	const { openProject, openModalVisible, setOpenModalVisible } = useProjectStore(
		useShallow((state) => ({
			openProject: state.openProject,
			openModalVisible: state.openModalVisible,
			setOpenModalVisible: state.setOpenModalVisible,
		})),
	);

	const onClose = useCallback(() => {
		setOpenModalVisible(false);
	}, [setOpenModalVisible]);

	const handleProjectClick = (projectId: string) => {
		openProject(projectId);
		onClose();
	};

	const onFromFileBtnClick = useCallback(async () => {
		let text: string | null = null;
		// @ts-expect-error The showOpenFilePicker API is not yet fully supported in TypeScript's
		if (typeof window !== "undefined" && window.showOpenFilePicker) {
			try {
				const handle = await openFileDialog("Fichiers JSON", {
					"application/json": [".json"],
				});
				if (!handle) return;
				const text = await readFile(handle);
			} catch (err: any) {
				console.error("Failed to open file:", err);
				alert(
					"Une erreur est survenue lors de la lecture du fichier. Assurez-vous que le fichier est un projet valide.",
				);
			}
		} else {
			text = await openFileViaInput(".json");
		}
		if (!text) return;
		let project: Project;
		try {
			project = Project.createFromJSON(text);
		} catch (err: any) {
			console.error("Failed to parse project JSON:", err);
			alert(
				"Une erreur est survenue lors de la lecture du fichier. Assurez-vous que le fichier est un projet valide.",
			);
			return;
		}
		localStorageSaveProject(project);
		await openProject(project.id);
		onClose();
	}, [openProject, onClose]);

	return (
		<CustomModal open={openModalVisible} onClose={onClose} title="Ouvrir un projet" width={500}>
			<Box>
				<Button variant="outlined" onClick={onFromFileBtnClick}>
					Ouvrir depuis un fichier...
				</Button>
			</Box>
			<Divider sx={{ mt: 2, mb: 0 }} />
			<ProjectsList reloadKey={openModalVisible} onProjectClick={handleProjectClick} />
		</CustomModal>
	);
}
