"use client";

import CustomModal from "@/lib/mui/CustomModal";
import ProjectsList from "./ProjectsList";

interface ProjectOpenModalProps {
	open: boolean;
	onClose: () => void;
	onProjectClick: (projectId: string) => void;
}

export default function ProjectOpenModal({ open, onClose, onProjectClick }: ProjectOpenModalProps) {
	const handleProjectClick = (projectId: string) => {
		onProjectClick(projectId);
		onClose();
	};

	return (
		<CustomModal open={open} onClose={onClose} title="Ouvrir un projet" width={500}>
			<ProjectsList reloadKey={open} onProjectClick={handleProjectClick} />
		</CustomModal>
	);
}
