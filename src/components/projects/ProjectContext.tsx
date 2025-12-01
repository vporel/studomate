"use client";
import Grafcet, { GrafcetFormat } from "@/schemas/grafcet/Grafcet.class";
import Project from "@/schemas/project/Project.class";
import { createElementId } from "@/schemas/schemas-helpers";
import mitt, { Emitter } from "mitt";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import UnsavedChangesDialog from "../dialogs/UnsavedChangesDialog";
import { ProjectEventsOut } from "./project-events";
import ProjectOpenModal from "./ProjectOpenModal";
import useGrafcetActions from "./useGrafcetActions";
import useProject from "./useProject";
import useProjectClose from "./useProjectClose";
import useProjectNew from "./useProjectNew";
import useProjectOpen from "./useProjectOpen";
import useProjectSave, { GrafcetRefData } from "./useProjectSave";
import useShortcutsHandler from "./useShortcutsHandler";

type ProjectContextType = {
	project: Project | null;
	changeProjectName: (newName: string) => void;
	changeProjectAuthor: (newAuthor: string) => void;
	updateGrafcetData: (grafcetId: string, data: GrafcetRefData) => void;
	hasUnsavedChanges: boolean;
	newProject: () => Promise<void>;
	openProject: () => void; // Returns true if a project was opened, false if cancelled or failed
	saveGrafcetData: (grafcetId: string) => void; //Save in the projet object (not in the file)
	saveProject: () => Promise<boolean | null>; // Returns true if saved, false if not saved (error), null if cancelled
	savingProject: boolean;
	closeProject: () => void;
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
	project: new Project(createElementId(), "Nouveau projet", ""),
	changeProjectName: () => {},
	changeProjectAuthor: () => {},
	updateGrafcetData: () => {},
	hasUnsavedChanges: false,
	newProject: async () => {},
	openProject: async () => false,
	saveGrafcetData: () => {},
	saveProject: async () => null,
	savingProject: false,
	closeProject: () => {},
	projectEventsOut: mitt<ProjectEventsOut>(),
	activeScope: null,
	setActiveScope: () => {},
	newGrafcet: () => null,
	deleteGrafcet: () => {},
	renameGrafcet: () => {},
});

export const ProjectContextProvider = ({ children }: { children: ReactNode }) => {
	const { project, setProject, changeProjectName, changeProjectAuthor } = useProject();
	const projectEventsOut = useMemo(() => mitt<ProjectEventsOut>(), []);
	const [unsavedChangesDialogOpen, setUnsavedChangesDialogOpen] = useState(false);
	const [onUnsavedChangesDialogCancel, setOnUnsavedChangesDialogCancel] = useState<null | (() => void)>(
		null
	);
	const [onUnsavedChangesDialogContinue, setOnUnsavedChangesDialogContinue] = useState<null | (() => void)>(
		null
	);
	const closeUnsavedChangesDialog = useCallback(() => setUnsavedChangesDialogOpen(false), []);
	const openUnsavedChangesDialog = useCallback((onCancel: (() => void) | null, onContinue: () => void) => {
		setUnsavedChangesDialogOpen(true);
		setOnUnsavedChangesDialogCancel(() => onCancel);
		setOnUnsavedChangesDialogContinue(() => onContinue);
	}, []);
	const {
		updateGrafcetData,
		saveGrafcetData,
		hasUnsavedChanges,
		setHasUnsavedChanges,
		saveProject,
		savingProject,
	} = useProjectSave(project, setProject, projectEventsOut);

	const { openProject, openModalVisible, showOpenModalWithPrompt, hideOpenModal } = useProjectOpen(
		setProject,
		hasUnsavedChanges,
		setHasUnsavedChanges,
		openUnsavedChangesDialog,
		projectEventsOut
	);

	const { newProjectWithPrompt } = useProjectNew(
		setProject,
		hasUnsavedChanges,
		setHasUnsavedChanges,
		openUnsavedChangesDialog,
		projectEventsOut
	);

	const { closeProjectWithPrompt } = useProjectClose(
		setProject,
		hasUnsavedChanges,
		setHasUnsavedChanges,
		openUnsavedChangesDialog,
		projectEventsOut
	);

	const { newGrafcet, deleteGrafcet, renameGrafcet } = useGrafcetActions(
		project,
		setProject,
		setHasUnsavedChanges,
		projectEventsOut
	);

	const [activeScope, setActiveScope] = useState<string | null>(null);

	useShortcutsHandler(newGrafcet, showOpenModalWithPrompt, saveProject);

	//Show a browser dialog when the user tries to close the tab or refresh the page with unsaved changes
	useEffect(() => {
		const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
			if (hasUnsavedChanges) {
				e.preventDefault();
			}
		};

		window.addEventListener("beforeunload", beforeUnloadHandler);
		return () => {
			window.removeEventListener("beforeunload", beforeUnloadHandler);
		};
	}, [hasUnsavedChanges]);

	return (
		<ProjectContext.Provider
			value={{
				project,
				changeProjectName,
				changeProjectAuthor,
				updateGrafcetData,
				hasUnsavedChanges,
				newProject: newProjectWithPrompt,
				openProject: showOpenModalWithPrompt,
				saveGrafcetData,
				saveProject,
				savingProject,
				closeProject: closeProjectWithPrompt,
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
			<ProjectOpenModal open={openModalVisible} onClose={hideOpenModal} onProjectClick={openProject} />
		</ProjectContext.Provider>
	);
};

export const useProjectContext = () => useContext(ProjectContext);
