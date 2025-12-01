"use client";

import Project from "@/schemas/project/Project.class";
import { Emitter } from "mitt";
import { Dispatch, SetStateAction, useCallback } from "react";
import { ProjectEventsOut } from "./project-events";

export default function useProjectClose(
	setProject: (p: Project | null) => void,
	hasUnsavedChanges: boolean,
	setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>,
	openUnsavedChangesDialog: (onCancel: (() => void) | null, onContinue: () => void) => void,
	projectEventsOut: Emitter<ProjectEventsOut>
): {
	closeProject: () => void;
	closeProjectWithPrompt: () => Promise<void>;
} {
	const closeProject = useCallback(() => {
		setProject(null);
	}, [setProject]);

	const closeProjectWithPrompt = useCallback(async () => {
		if (hasUnsavedChanges) {
			openUnsavedChangesDialog(null, () => {
				closeProject();
				setHasUnsavedChanges(false);
				projectEventsOut.emit("project-closed");
			});
		} else {
			closeProject();
			setHasUnsavedChanges(false);
			projectEventsOut.emit("project-closed");
		}
	}, [hasUnsavedChanges, setHasUnsavedChanges, closeProject, openUnsavedChangesDialog, projectEventsOut]);

	return { closeProject, closeProjectWithPrompt };
}
