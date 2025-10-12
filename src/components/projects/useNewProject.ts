"use client";

import Project from "@/schemas/project/Project.class";
import { useCallback } from "react";

export default function useNewProject(
	setProject: (p: Project) => void,
	setFileHandle: (fh: FileSystemFileHandle | null) => void,
	hasUnsavedChanges: boolean,
	openUnsavedChangesDialog: () => void,
	setOnUnsavedChangesDialogCancel: (cb: (() => void) | null) => void,
	setOnUnsavedChangesDialogContinue: (cb: () => void) => void
): {
	newProject: () => void;
	newProjectWithPrompt: () => Promise<void>;
} {
	const newProject = useCallback(() => {
		setProject(new Project("Nouveau projet", ""));
		setFileHandle(null);
	}, [setProject, setFileHandle]);

	const newProjectWithPrompt = useCallback(async () => {
		if (hasUnsavedChanges) {
			setOnUnsavedChangesDialogCancel(null);
			setOnUnsavedChangesDialogContinue(() => () => {
				newProject();
			});
			openUnsavedChangesDialog();
		} else {
			newProject();
		}
	}, [
		hasUnsavedChanges,
		newProject,
		openUnsavedChangesDialog,
		setOnUnsavedChangesDialogCancel,
		setOnUnsavedChangesDialogContinue,
	]);

	return { newProject, newProjectWithPrompt };
}
