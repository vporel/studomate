"use client";
import useBooleanState from "@/lib/hooks/useBooleanState";
import Grafcet, { GrafcetFormat } from "@/schemas/grafcet/Grafcet.class";
import Project from "@/schemas/project/Project.class";
import mitt, { Emitter } from "mitt";
import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import UnsavedChangesDialog from "../dialogs/UnsavedChangesDialog";
import { ProjectEventsOut } from "./project-events";
import useGrafcetActions from "./useGrafcetActions";
import useProject from "./useProject";
import useNewProject from "./useProjectNew";
import useProjectOpen from "./useProjectOpen";
import useProjectSave from "./useProjectSave";
import useShortcutsHandler from "./useShortcutsHandler";

type ProjectContextType = {
	project: Project | null;
	changeProjectName: (newName: string) => void;
	changeProjectAuthor: (newAuthor: string) => void;
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
	newGrafcet: (name: string, format: GrafcetFormat) => Grafcet | null;
	deleteGrafcet: (grafcetId: string) => void;
	renameGrafcet: (grafcetId: string, newName: string) => void;
};

const ProjectContext = createContext<ProjectContextType>({
	project: new Project("Nouveau projet", ""),
	changeProjectName: () => {},
	changeProjectAuthor: () => {},
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
	newGrafcet: () => null,
	deleteGrafcet: () => {},
	renameGrafcet: () => {},
});

export const ProjectContextProvider = ({ children }: { children: ReactNode }) => {
	const { project, setProject, fileHandle, setFileHandle, changeProjectName, changeProjectAuthor } =
		useProject();
	const projectEventsOut = useMemo(() => mitt<ProjectEventsOut>(), []);
	const [unsavedChangesDialogOpen, openUnsavedChangesDialog, closeUnsavedChangesDialog] =
		useBooleanState(false);
	const [onUnsavedChangesDialogCancel, setOnUnsavedChangesDialogCancel] = useState<null | (() => void)>(
		null
	);
	const [onUnsavedChangesDialogContinue, setOnUnsavedChangesDialogContinue] = useState<null | (() => void)>(
		null
	);
	const {
		updateGrafcetData,
		saveGrafcetData,
		hasUnsavedChanges,
		setHasUnsavedChanges,
		saveProject,
		savingProject,
	} = useProjectSave(project, setProject, fileHandle, setFileHandle, projectEventsOut);

	const { openProjectWithPrompt } = useProjectOpen(
		setProject,
		setFileHandle,
		hasUnsavedChanges,
		setHasUnsavedChanges,
		openUnsavedChangesDialog,
		setOnUnsavedChangesDialogCancel,
		setOnUnsavedChangesDialogContinue,
		projectEventsOut
	);

	const { newProjectWithPrompt } = useNewProject(
		setProject,
		setFileHandle,
		hasUnsavedChanges,
		setHasUnsavedChanges,
		openUnsavedChangesDialog,
		setOnUnsavedChangesDialogCancel,
		setOnUnsavedChangesDialogContinue,
		projectEventsOut
	);

	const { newGrafcet, deleteGrafcet, renameGrafcet } = useGrafcetActions(
		project,
		setProject,
		setHasUnsavedChanges,
		projectEventsOut
	);

	const [activeScope, setActiveScope] = useState<string | null>(null);

	useShortcutsHandler(newGrafcet, openProjectWithPrompt, saveProject);

	return (
		<ProjectContext.Provider
			value={{
				project,
				changeProjectName,
				changeProjectAuthor,
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
				newGrafcet,
				deleteGrafcet,
				renameGrafcet,
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
