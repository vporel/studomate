"use client";

import { parseProjectFromFile } from "@/persistence/project-file";
import Project from "@/schemas/project/project.schema";
import { openFileDialog, openFileViaInput, readFile } from "@/ui/lib/file-system";
import CustomModal from "@/ui/lib/mui/CustomModal";
import { Box, Button, Divider } from "@mui/material";
import { useCallback } from "react";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "./ProjectContext";
import ProjectsList from "./ProjectsList";

export default function ProjectOpenModal() {
	const projectRepository = useProjectStore((state) => state.projectRepository);
	const { openProject, openModalVisible, setOpenModalVisible } = useProjectStore(
		useShallow((state) => ({
			openProject: state.openProject,
			openModalVisible: state.ui.openModalVisible,
			setOpenModalVisible: state.setOpenModalVisible,
		})),
	);

	const onClose = useCallback(() => {
		setOpenModalVisible(false);
	}, [setOpenModalVisible]);

	const handleProjectClick = (projectId: string) => {
		void openProject(projectId);
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
				text = await readFile(handle);
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
			project = parseProjectFromFile(text);
		} catch (err: any) {
			console.error("Failed to parse project JSON:", err);
			alert(
				"Une erreur est survenue lors de la lecture du fichier. Assurez-vous que le fichier est un projet valide.",
			);
			return;
		}
		const saveResult = projectRepository.save(project);
		if (!saveResult.ok) {
			alert("Le projet n'a pas pu être enregistré dans le navigateur. Vérifiez l'espace disponible.");
			return;
		}
		await openProject(project.id);
		onClose();
	}, [openProject, onClose, projectRepository]);

	return (
		<CustomModal open={openModalVisible} onClose={onClose} title="Ouvrir un projet" width={500}>
			<Box>
				<Button variant="outlined" onClick={() => void onFromFileBtnClick()}>
					Ouvrir depuis un fichier...
				</Button>
			</Box>
			<Divider sx={{ mt: 2, mb: 0 }} />
			<ProjectsList reloadKey={openModalVisible} onProjectClick={handleProjectClick} />
		</CustomModal>
	);
}
