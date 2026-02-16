"use client";

import CustomModal from "@/lib/mui/CustomModal";
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

	return (
		<CustomModal open={openModalVisible} onClose={onClose} title="Ouvrir un projet" width={500}>
			<ProjectsList reloadKey={openModalVisible} onProjectClick={handleProjectClick} />
		</CustomModal>
	);
}
