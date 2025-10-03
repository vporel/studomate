"use client";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import AbstractProjectCommand from "@/schemas/project/commands/AbstractProjectCommand.class";
import Project from "@/schemas/project/Project.class";
import { createContext, ReactNode, useContext } from "react";
import useCommandsStack from "./useCommandsStack";
import useProject from "./useProject";

export type GrafcetEvents = {};

type ProjectContextType = {
	project: Project | null;
	updateGrafcetData: (grafcetId: string, data: { grafcet?: Grafcet; flowNodes?: any[] }) => void;
	hasUnsavedChanges: boolean;
	saveProject: () => Promise<boolean | null>; // Returns true if saved, false if not saved (error), null if cancelled
	undoLastCommand: () => AbstractProjectCommand<any>[] | null;
	redoLastCommand: () => AbstractProjectCommand<any>[] | null;
};

const ProjectContext = createContext<ProjectContextType>({
	project: new Project("Nouveau projet", ""),
	updateGrafcetData: () => {},
	hasUnsavedChanges: false,
	saveProject: async () => null,
	undoLastCommand: () => null,
	redoLastCommand: () => null,
});

export const ProjectContextProvider = ({ children }: { children: ReactNode }) => {
	const { project, setProject, updateGrafcetData, hasUnsavedChanges, saveProject } = useProject();
	const { commandsStackRef, undoLastCommand, redoLastCommand } = useCommandsStack(project, setProject);

	return (
		<ProjectContext.Provider
			value={{
				project,
				updateGrafcetData,
				hasUnsavedChanges,
				saveProject,
				undoLastCommand,
				redoLastCommand,
			}}
		>
			{children}
		</ProjectContext.Provider>
	);
};

export const useProjectContext = () => useContext(ProjectContext);
