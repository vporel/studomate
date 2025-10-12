"use client";

import Project from "@/schemas/project/Project.class";
import { Emitter } from "mitt";
import { Dispatch, SetStateAction, useCallback } from "react";
import { ProjectEventsOut } from "./project-events";

export default function useNewProject(
	setProject: (p: Project) => void,
	setFileHandle: (fh: FileSystemFileHandle | null) => void,
	hasUnsavedChanges: boolean,
	setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>,
	openUnsavedChangesDialog: () => void,
	setOnUnsavedChangesDialogCancel: (cb: (() => void) | null) => void,
	setOnUnsavedChangesDialogContinue: (cb: () => void) => void,
	projectEventsOut: Emitter<ProjectEventsOut>
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
				setHasUnsavedChanges(false);
				projectEventsOut.emit("project-created");
			});
			openUnsavedChangesDialog();
		} else {
			newProject();
			setHasUnsavedChanges(false);
			projectEventsOut.emit("project-created");
		}
	}, [
		hasUnsavedChanges,
		setHasUnsavedChanges,
		newProject,
		openUnsavedChangesDialog,
		setOnUnsavedChangesDialogCancel,
		setOnUnsavedChangesDialogContinue,
		projectEventsOut,
	]);

	return { newProject, newProjectWithPrompt };
}
