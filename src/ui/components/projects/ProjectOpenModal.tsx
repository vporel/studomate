"use client";

import {
	importProjectFromFile,
	ProjectFileError,
	type ProjectFileErrorReason,
} from "@/persistence/project-file";
import Project from "@/schemas/project/project.schema";
import {
	openFileDialog,
	openFileViaInput,
	readFile,
} from "@/ui/lib/file-system";
import CustomModal from "@/ui/components/mui/CustomModal";
import { Alert, Box, Button, Divider } from "@mui/material";
import { useCallback, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "./ProjectContext";
import ProjectsList from "./ProjectsList";
import { useT } from "@/ui/i18n/useT";

type OpenError = ProjectFileErrorReason | "read-failed" | "save-failed";

const ERROR_KEYS = {
	"not-json": "errors.notJson",
	"not-a-project": "errors.notAProject",
	"newer-version": "errors.newerVersion",
	"read-failed": "errors.readFailed",
	"save-failed": "errors.saveFailed",
} as const satisfies Record<OpenError, string>;

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

	const [error, setError] = useState<OpenError | null>(null);

	const onClose = useCallback(() => {
		setError(null);
		setOpenModalVisible(false);
	}, [setOpenModalVisible]);

	const handleProjectClick = (projectId: string) => {
		void lifecycleManager.openProject(projectId);
		onClose();
	};

	const onFromFileBtnClick = useCallback(async () => {
		setError(null);
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
				setError("read-failed");
			}
		} else {
			text = await openFileViaInput(".json");
		}
		if (!text) return;
		let project: Project;
		try {
			project = importProjectFromFile(text);
		} catch (err: any) {
			console.error("Failed to parse project JSON:", err);
			setError(err instanceof ProjectFileError ? err.reason : "not-a-project");
			return;
		}
		const saveResult = await projectRepository.save(project);
		if (!saveResult.ok) {
			setError("save-failed");
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
			{error && (
				<Alert severity="error" onClose={() => setError(null)} sx={{ mt: 2 }}>
					{t(ERROR_KEYS[error])}
				</Alert>
			)}
			<Divider sx={{ mt: 2, mb: 0 }} />
			<ProjectsList
				reloadKey={openModalVisible}
				onProjectClick={handleProjectClick}
			/>
		</CustomModal>
	);
}
