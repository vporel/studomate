"use client";

import Project from "@/schemas/project/Project.class";
import { createElementId } from "@/schemas/schemas-helpers";
import { Emitter } from "mitt";
import { Dispatch, SetStateAction, useCallback } from "react";
import { ProjectEventsOut } from "./project-events";

export default function useProjectNew(
	setProject: (p: Project) => void,
	hasUnsavedChanges: boolean,
	setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>,
	openUnsavedChangesDialog: (onCancel: (() => void) | null, onContinue: () => void) => void,
	projectEventsOut: Emitter<ProjectEventsOut>
): {
	newProject: () => void;
	newProjectWithPrompt: () => Promise<void>;
} {
	const newProject = useCallback(() => {
		setProject(new Project(createElementId(), "Nouveau projet", ""));
	}, [setProject]);

	const newProjectWithPrompt = useCallback(async () => {
		if (hasUnsavedChanges) {
			openUnsavedChangesDialog(null, () => {
				newProject();
				setHasUnsavedChanges(false);
				projectEventsOut.emit("project-created");
			});
		} else {
			newProject();
			setHasUnsavedChanges(false);
			projectEventsOut.emit("project-created");
		}
	}, [hasUnsavedChanges, setHasUnsavedChanges, newProject, openUnsavedChangesDialog, projectEventsOut]);

	return { newProject, newProjectWithPrompt };
}
