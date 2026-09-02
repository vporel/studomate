"use client";

import { parseProjectFromFile } from "@/persistence/project-file";
import Project from "@/schemas/project/project.schema";
import {
	openFileDialog,
	openFileViaInput,
	readFile,
} from "@/ui/lib/file-system";
import CustomModal from "@/ui/lib/mui/CustomModal";
import { Box, Button, Divider } from "@mui/material";
import { useCallback } from "react";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "./ProjectContext";
import ProjectsList from "./ProjectsList";
import { useT } from "@/ui/i18n/useT";

export default function ProjectOpenModal() {
	const t = useT("projects.open");
	const projectRepository = useProjectStore((state) => state.projectRepository);
	const { lifecycleManager, openModalVisible, setOpenModalVisible } =
		useProjectStore(
			useShallow((state) => ({
				lifecycleManager: state.lifecycleManager,
				openModalVisible: state.ui.openModalVisible,
				setOpenModalVisible: state.setOpenModalVisible,
			})),
		);

	const onClose = useCallback(() => {
		setOpenModalVisible(false);
	}, [setOpenModalVisible]);

	const handleProjectClick = (projectId: string) => {
		void lifecycleManager.openProject(projectId);
		onClose();
	};

	const onFromFileBtnClick = useCallback(async () => {
		let text: string | null = null;
		if (typeof window !== "undefined" && window.showOpenFilePicker) {
			try {
				const handle = await openFileDialog(t("fileDialogName"), {
					"application/json": [".json"],
				});
				if (!handle) return;
				text = await readFile(handle);
			} catch (err: any) {
				console.error("Failed to open file:", err);
				alert(
					t("readError"),
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
				t("readError"),
			);
			return;
		}
		const saveResult = await projectRepository.save(project);
		if (!saveResult.ok) {
			alert(
				t("saveError"),
			);
			return;
		}
		await lifecycleManager.openProject(project.id);
		onClose();
	}, [lifecycleManager, onClose, projectRepository, t]);

	return (
		<CustomModal
			open={openModalVisible}
			onClose={onClose}
			title={t("title")}
			width={500}
		>
			<Box>
				<Button variant="outlined" onClick={() => void onFromFileBtnClick()}>
					{t("fromFile")}
				</Button>
			</Box>
			<Divider sx={{ mt: 2, mb: 0 }} />
			<ProjectsList
				reloadKey={openModalVisible}
				onProjectClick={handleProjectClick}
			/>
		</CustomModal>
	);
}
