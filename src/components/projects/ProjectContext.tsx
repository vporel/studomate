"use client";
import useBooleanState from "@/lib/hooks/useBooleanState";
import Grafcet, { GrafcetFormat } from "@/schemas/grafcet/Grafcet.class";
import Project from "@/schemas/project/Project.class";
import mitt, { Emitter } from "mitt";
import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import UnsavedChangesDialog from "../misc/UnsavedChangesDialog";
import { ProjectEventsOut } from "./project-events";
import useNewProject from "./useNewProject";
import useOpenProject from "./useOpenProject";
import useProject from "./useProject";
import useSaveProject from "./useSaveProject";
import useShortcutsHandler from "./useShortcutsHandler";

type ProjectContextType = {
	project: Project | null;
	newGrafcet: (name: string, format: GrafcetFormat) => Grafcet | null;
	updateGrafcetData: (grafcetId: string, data: { grafcet?: Grafcet; flowNodes?: any[] }) => void;
	hasUnsavedChanges: boolean;
	newProject: () => Promise<void>;
	openProject: () => Promise<boolean>; // Returns true if a project was opened, false if cancelled or failed
	saveGrafcetData: (grafcetId: string) => void; //Save in the projet object (not in the file)
	saveProject: () => Promise<boolean | null>; // Returns true if saved, false if not saved (error), null if cancelled
	savingProject: boolean;
	projectEventsOut: Emitter<ProjectEventsOut>;
	/**
	 * The currently active scope (used for keyboard shortcuts)
	 * The scope can be defined by an objectId (for example, the grafcetId of the currently active grafcet)
	 */
	activeScope: string | null;
	setActiveScope: (scope: string) => void;
};

const ProjectContext = createContext<ProjectContextType>({
	project: new Project("Nouveau projet", ""),
	newGrafcet: () => null,
	updateGrafcetData: () => {},
	hasUnsavedChanges: false,
	newProject: async () => {},
	openProject: async () => false,
	saveGrafcetData: () => {},
	saveProject: async () => null,
	savingProject: false,
	projectEventsOut: mitt<ProjectEventsOut>(),
	activeScope: null,
	setActiveScope: () => {},
});

export const ProjectContextProvider = ({ children }: { children: ReactNode }) => {
	const { project, setProject, fileHandle, setFileHandle } = useProject();
	const projectEventsOut = useMemo(() => mitt<ProjectEventsOut>(), []);
	const [unsavedChangesDialogOpen, openUnsavedChangesDialog, closeUnsavedChangesDialog] =
		useBooleanState(false);
	const [onUnsavedChangesDialogCancel, setOnUnsavedChangesDialogCancel] = useState<null | (() => void)>(
		null
	);
	const [onUnsavedChangesDialogContinue, setOnUnsavedChangesDialogContinue] = useState<null | (() => void)>(
		null
	);
	const newGrafcet = useCallback(
		(name: string, format: GrafcetFormat) => {
			if (!project) return null;
			const newProject = Object.assign(new Project("", ""), project);
			const grafcet = newProject.addGrafcet(name, format);
			projectEventsOut.emit("grafcet-open", grafcet);
			setProject(newProject);
			return grafcet;
		},
		[project, projectEventsOut, setProject]
	);
	const { updateGrafcetData, saveGrafcetData, hasUnsavedChanges, saveProject, savingProject } =
		useSaveProject(project, setProject, fileHandle, setFileHandle, projectEventsOut);
	const { openProjectWithPrompt } = useOpenProject(
		setProject,
		setFileHandle,
		hasUnsavedChanges,
		openUnsavedChangesDialog,
		setOnUnsavedChangesDialogCancel,
		setOnUnsavedChangesDialogContinue
	);
	const { newProjectWithPrompt } = useNewProject(
		setProject,
		setFileHandle,
		hasUnsavedChanges,
		openUnsavedChangesDialog,
		setOnUnsavedChangesDialogCancel,
		setOnUnsavedChangesDialogContinue
	);
	const [activeScope, setActiveScope] = useState<string | null>(null);

	useShortcutsHandler(newGrafcet, openProjectWithPrompt, saveProject);

	return (
		<ProjectContext.Provider
			value={{
				project,
				newGrafcet,
				updateGrafcetData,
				hasUnsavedChanges,
				newProject: newProjectWithPrompt,
				openProject: openProjectWithPrompt,
				saveGrafcetData,
				saveProject,
				savingProject,
				projectEventsOut,
				activeScope,
				setActiveScope,
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
