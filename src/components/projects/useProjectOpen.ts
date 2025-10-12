"use client";

import { openFileDialog, readFile } from "@/lib/file-system";
import Project from "@/schemas/project/Project.class";
import { Emitter } from "mitt";
import { Dispatch, SetStateAction, useCallback } from "react";
import { ProjectEventsOut } from "./project-events";

export default function useProjectOpen(
	setProject: (g: Project) => void,
	setFileHandle: (fh: FileSystemFileHandle | null) => void,
	hasUnsavedChanges: boolean,
	setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>,
	openUnsavedChangesDialog: () => void,
	setOnUnsavedChangesDialogCancel: (cb: () => void) => void,
	setOnUnsavedChangesDialogContinue: (cb: () => void) => void,
	projectEventsOut: Emitter<ProjectEventsOut>
): {
	openProject: () => Promise<boolean>; // Returns true if a project was opened, false if cancelled or failed
	openProjectWithPrompt: () => Promise<boolean>;
} {
	const openProject = useCallback(async () => {
		const handle = await openFileDialog("Fichiers JSON", { "application/json": [".json"] });
		if (!handle) return false;
		const text = await readFile(handle);
		const newProject = Project.createFromJSON(text);
		setFileHandle(handle);
		setProject(newProject);
		return true;
	}, [setFileHandle, setProject]);

	const openProjectWithPrompt = useCallback(() => {
		return new Promise<boolean>((resolve) => {
			if (hasUnsavedChanges) {
				setOnUnsavedChangesDialogCancel(() => () => {
					resolve(false);
				});
				setOnUnsavedChangesDialogContinue(() => () => {
					openProject().then((result) => {
						resolve(result);
						setHasUnsavedChanges(false);
						projectEventsOut.emit("project-opened");
					});
				});
				openUnsavedChangesDialog();
			} else {
				openProject().then((result) => {
					resolve(result);
					setHasUnsavedChanges(false);
					projectEventsOut.emit("project-opened");
				});
			}
		});
	}, [
		hasUnsavedChanges,
		setHasUnsavedChanges,
		openProject,
		openUnsavedChangesDialog,
		projectEventsOut,
		setOnUnsavedChangesDialogCancel,
		setOnUnsavedChangesDialogContinue,
	]);

	return { openProject, openProjectWithPrompt };
}
