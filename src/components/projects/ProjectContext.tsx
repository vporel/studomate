"use client";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import AbstractProjectCommand from "@/schemas/project/commands/AbstractProjectCommand.class";
import Project from "@/schemas/project/Project.class";
import { createContext, ReactNode, useContext } from "react";
import UnsavedChangesDialog from "../misc/UnsavedChangesDialog";
import useCommandsStack from "./useCommandsStack";
import useOpenProject from "./useOpenProject";
import useProject from "./useProject";
import useSaveProject from "./useSaveProject";

export type GrafcetEvents = {};

type ProjectContextType = {
	project: Project | null;
	updateGrafcetData: (grafcetId: string, data: { grafcet?: Grafcet; flowNodes?: any[] }) => void;
	hasUnsavedChanges: boolean;
	openProject: () => Promise<boolean>; // Returns true if a project was opened, false if cancelled or failed
	saveProject: () => Promise<boolean | null>; // Returns true if saved, false if not saved (error), null if cancelled
	undoLastCommand: () => AbstractProjectCommand<any>[] | null;
	redoLastCommand: () => AbstractProjectCommand<any>[] | null;
};

const ProjectContext = createContext<ProjectContextType>({
	project: new Project("Nouveau projet", ""),
	updateGrafcetData: () => {},
	hasUnsavedChanges: false,
	openProject: async () => false,
	saveProject: async () => null,
	undoLastCommand: () => null,
	redoLastCommand: () => null,
});

export const ProjectContextProvider = ({ children }: { children: ReactNode }) => {
	const { project, setProject, fileHandle, setFileHandle } = useProject();
	const { updateGrafcetData, hasUnsavedChanges, saveProject } = useSaveProject(
		project,
		setProject,
		fileHandle,
		setFileHandle
	);
	const { openProject, unsavedChangesDialogOpen, closeUnsavedChangesDialog } = useOpenProject(
		hasUnsavedChanges,
		setProject,
		setFileHandle
	);
	const { commandsStackRef, undoLastCommand, redoLastCommand } = useCommandsStack(project, setProject);

	return (
		<ProjectContext.Provider
			value={{
				project,
				updateGrafcetData,
				hasUnsavedChanges,
				openProject,
				saveProject,
				undoLastCommand,
				redoLastCommand,
			}}
		>
			{children}
			<UnsavedChangesDialog
				open={unsavedChangesDialogOpen}
				message="Voulez-vous enregistrer les modifications avant de quitter le projet ?"
				onCancel={closeUnsavedChangesDialog}
				onSave={saveProject}
			/>
		</ProjectContext.Provider>
	);
};

export const useProjectContext = () => useContext(ProjectContext);
