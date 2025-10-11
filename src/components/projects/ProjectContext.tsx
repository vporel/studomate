"use client";
import useBooleanState from "@/lib/hooks/useBooleanState";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import AbstractProjectCommand from "@/schemas/project/commands/AbstractProjectCommand.class";
import Project from "@/schemas/project/Project.class";
import mitt, { Emitter } from "mitt";
import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import UnsavedChangesDialog from "../misc/UnsavedChangesDialog";
import { ProjectEvents } from "./project-events";
import useCommandsStack from "./useCommandsStack";
import useOpenProject from "./useOpenProject";
import useProject from "./useProject";
import useSaveProject from "./useSaveProject";

type ProjectContextType = {
	project: Project | null;
	updateGrafcetData: (grafcetId: string, data: { grafcet?: Grafcet; flowNodes?: any[] }) => void;
	hasUnsavedChanges: boolean;
	newProject: () => Promise<void>;
	openProject: () => Promise<boolean>; // Returns true if a project was opened, false if cancelled or failed
	saveProject: () => Promise<boolean | null>; // Returns true if saved, false if not saved (error), null if cancelled
	savingProject: boolean;
	undoLastCommand: () => AbstractProjectCommand<any>[] | null;
	redoLastCommand: () => AbstractProjectCommand<any>[] | null;
	projectEvents: Emitter<ProjectEvents>;
};

const ProjectContext = createContext<ProjectContextType>({
	project: new Project("Nouveau projet", ""),
	updateGrafcetData: () => {},
	hasUnsavedChanges: false,
	newProject: async () => {},
	openProject: async () => false,
	saveProject: async () => null,
	savingProject: false,
	undoLastCommand: () => null,
	redoLastCommand: () => null,
	projectEvents: mitt<ProjectEvents>(),
});

export const ProjectContextProvider = ({ children }: { children: ReactNode }) => {
	const { project, setProject, fileHandle, setFileHandle } = useProject();
	const projectEvents = useMemo(() => mitt<ProjectEvents>(), []);
	const { updateGrafcetData, hasUnsavedChanges, saveProject, savingProject } = useSaveProject(
		project,
		setProject,
		fileHandle,
		setFileHandle,
		projectEvents
	);
	const { openProject } = useOpenProject(setProject, setFileHandle);
	const [unsavedChangesDialogOpen, openUnsavedChangesDialog, closeUnsavedChangesDialog] =
		useBooleanState(false);
	const [onUnsavedChangesDialogCancel, setOnUnsavedChangesDialogCancel] = useState<null | (() => void)>(
		null
	);
	const [onUnsavedChangesDialogContinue, setOnUnsavedChangesDialogContinue] = useState<null | (() => void)>(
		null
	);
	const { commandsStackRef, undoLastCommand, redoLastCommand } = useCommandsStack(project, setProject);

	const newProject = useCallback(() => {
		setProject(new Project("Nouveau projet", ""));
		setFileHandle(null);
		commandsStackRef.current.clear();
	}, [setProject, setFileHandle, commandsStackRef]);

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
	}, [hasUnsavedChanges, newProject, openUnsavedChangesDialog]);

	const openProjectWithPrompt = useCallback(() => {
		return new Promise<boolean>((resolve) => {
			if (hasUnsavedChanges) {
				setOnUnsavedChangesDialogCancel(() => () => {
					resolve(false);
				});
				setOnUnsavedChangesDialogContinue(() => () => {
					openProject().then((result) => {
						resolve(result);
						commandsStackRef.current.clear();
					});
				});
				openUnsavedChangesDialog();
			} else {
				openProject().then((result) => {
					resolve(result);
					commandsStackRef.current.clear();
				});
			}
		});
	}, [commandsStackRef, hasUnsavedChanges, openProject, openUnsavedChangesDialog]);

	return (
		<ProjectContext.Provider
			value={{
				project,
				updateGrafcetData,
				hasUnsavedChanges,
				newProject: newProjectWithPrompt,
				openProject: openProjectWithPrompt,
				saveProject,
				savingProject,
				undoLastCommand,
				redoLastCommand,
				projectEvents,
			}}
		>
			{children}
			<UnsavedChangesDialog
				open={unsavedChangesDialogOpen}
				message="Voulez-vous enregistrer les modifications avant de quitter le projet ?"
				onCancel={async () => {
					closeUnsavedChangesDialog();
					if (onUnsavedChangesDialogCancel) onUnsavedChangesDialogCancel();
				}}
				onContinueWithoutSaving={async () => {
					closeUnsavedChangesDialog();
					if (onUnsavedChangesDialogContinue) onUnsavedChangesDialogContinue();
				}}
				onSave={async () => {
					await saveProject();
					closeUnsavedChangesDialog();
					if (onUnsavedChangesDialogContinue) onUnsavedChangesDialogContinue();
				}}
			/>
		</ProjectContext.Provider>
	);
};

export const useProjectContext = () => useContext(ProjectContext);
