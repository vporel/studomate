"use client";

import useBooleanState from "@/lib/hooks/useBooleanState";
import { localStorageGetProject } from "@/local-storage/projects";
import Project from "@/schemas/project/Project.class";
import { Emitter } from "mitt";
import { Dispatch, SetStateAction, useCallback } from "react";
import { ProjectEventsOut } from "./project-events";

export default function useProjectOpen(
	setProject: (g: Project) => void,
	hasUnsavedChanges: boolean,
	setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>,
	openUnsavedChangesDialog: (onCancel: (() => void) | null, onContinue: () => void) => void,
	projectEventsOut: Emitter<ProjectEventsOut>
): {
	openProject: (projectId: string) => Promise<boolean>; // Returns true if a project was opened, false if cancelled or failed
	openModalVisible: boolean;
	showOpenModal: () => void;
	showOpenModalWithPrompt: () => void;
	hideOpenModal: () => void;
} {
	const [openModalVisible, showOpenModal, hideOpenModal] = useBooleanState(false);

	const openProject = useCallback(
		async (projectId: string) => {
			const project = localStorageGetProject(projectId);
			if (!project) return false;
			setProject(project);
			projectEventsOut.emit("project-opened");
			return true;
		},
		[projectEventsOut, setProject]
	);

	const showOpenModalWithPrompt = useCallback(() => {
		if (!hasUnsavedChanges) {
			showOpenModal();
		} else {
			openUnsavedChangesDialog(null, showOpenModal);
		}
	}, [hasUnsavedChanges, showOpenModal, openUnsavedChangesDialog]);

	return { openProject, openModalVisible, showOpenModal, showOpenModalWithPrompt, hideOpenModal };
}
