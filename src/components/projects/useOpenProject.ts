"use client";

import { openFileDialog, readFile } from "@/lib/file-system";
import useBooleanState from "@/lib/hooks/useBooleanState";
import Project from "@/schemas/project/Project.class";
import { useCallback } from "react";

export default function useOpenProject(
	hasProjectUnsavedChanges: boolean,
	setProject: (g: Project) => void,
	setFileHandle: (fh: FileSystemFileHandle | null) => void
): {
	openProject: () => Promise<boolean>; // Returns true if a project was opened, false if cancelled or failed
	unsavedChangesDialogOpen: boolean;
	closeUnsavedChangesDialog: () => void;
} {
	const [unsavedChangesDialogOpen, openUnsavedChangesDialog, closeUnsavedChangesDialog] =
		useBooleanState(false);

	const openProject = useCallback(async () => {
		if (hasProjectUnsavedChanges) {
			openUnsavedChangesDialog();
			return false;
		}
		const handle = await openFileDialog("Fichiers JSON", { "application/json": [".json"] });
		if (!handle) return false;
		const text = await readFile(handle);
		const json = JSON.parse(text);
		const newProject = Object.assign(Object.create(Project.prototype), json);
		setFileHandle(handle);
		setProject(newProject);
		return true;
	}, [hasProjectUnsavedChanges, openUnsavedChangesDialog, setFileHandle, setProject]);

	return { openProject, unsavedChangesDialogOpen, closeUnsavedChangesDialog };
}
