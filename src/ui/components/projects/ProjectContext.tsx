"use client";
import {
	createProjectStore,
	ProjectStoreState,
} from "@/ui/stores/project/project.store";
import { setLastMousePosition } from "@/ui/lib/mouse-position";
import {
	getProjectIdFromUrl,
	getShareTokenFromUrl,
	setProjectIdInUrl,
} from "@/ui/lib/project-url";
import {
	createContext,
	ReactNode,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { StoreApi, useStore } from "zustand";
import AnalysisResult from "./analysis-result/AnalysisResult";
import ExportModal from "./ExportModal";
import NewProjectModal from "./NewProjectModal";
import PdfExportModal from "../pdf/PdfExportModal";
import ProjectOpenModal from "./ProjectOpenModal";
import SaveAsModal from "./SaveAsModal";
import ShareProjectModal from "./ShareProjectModal";
import ShareRequiresCloudModal from "./ShareRequiresCloudModal";
import DraftRecoveryDialog from "./DraftRecoveryDialog";
import DraftConflictDialog from "./DraftConflictDialog";
import UnsavedChangesDialog from "./ProjectUnsavedChangesDialog";
import useShortcutsHandler from "./useShortcutsHandler";
import Project from "@/schemas/project/project.schema";

const ProjectContext = createContext<StoreApi<ProjectStoreState> | null>(null);

function ShortcutsHandler() {
	useShortcutsHandler();
	return null;
}

export const ProjectContextProvider = ({
	children,
}: {
	children: ReactNode;
}) => {
	const storeRef = useRef<StoreApi<ProjectStoreState> | null>(null);

	if (!storeRef.current) {
		storeRef.current = createProjectStore();
	}

	useEffect(() => {
		const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
			if (!storeRef.current?.getState().hasUnsavedChanges) return;
			e.preventDefault();
		};

		window.addEventListener("beforeunload", beforeUnloadHandler);
		return () => {
			window.removeEventListener("beforeunload", beforeUnloadHandler);
		};
	}, []);

	useEffect(() => {
		const handleMouseMove = (event: MouseEvent) => {
			setLastMousePosition(event.clientX, event.clientY);
		};
		window.addEventListener("mousemove", handleMouseMove);
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
		};
	}, []);

	// Démarre l'auto-save dès le montage, l'arrête au démontage
	useEffect(() => {
		storeRef.current!.getState().startAutoSave();
		return () => {
			storeRef.current!.getState().stopAutoSave();
		};
	}, []);

	// Ouverture par token de partage (prioritaire sur l'id de projet)
	useEffect(() => {
		const shareToken = getShareTokenFromUrl();
		if (!shareToken) return;
		void storeRef.current!.getState().openProjectByShareToken(shareToken);
	}, []);

	// Affichée au démarrage à froid (aucun projet ni token dans l'URL) ; réactivée plus bas si
	// la réouverture d'un projet dont l'id est dans l'URL échoue (id invalide, projet supprimé).
	const [showDraftDialog, setShowDraftDialog] = useState(
		() => !getProjectIdFromUrl() && !getShareTokenFromUrl(),
	);

	// Rouvre le projet dont l'id voyage dans l'URL, en cherchant d'abord un brouillon
	useEffect(() => {
		if (getShareTokenFromUrl()) return;
		const projectId = getProjectIdFromUrl();
		if (!projectId) return;
		const reopen = async () => {
			const opened = await storeRef
				.current!.getState()
				.openProject(projectId, true);
			if (!opened) {
				setProjectIdInUrl(null);
				setShowDraftDialog(true);
			}
		};
		void reopen();
	}, []);

	const handleDraftOpen = (draftData: string) => {
		try {
			const project = Project.createFromJSON(draftData);
			void storeRef.current!.getState().openProject(project.id, true);
		} catch {
			// brouillon corrompu : ignoré silencieusement
		}
	};

	return (
		<ProjectContext.Provider value={storeRef.current}>
			{children}
			<ShortcutsHandler />
			<UnsavedChangesDialog />
			<NewProjectModal />
			<ProjectOpenModal />
			<ExportModal />
			<PdfExportModal />
			<SaveAsModal />
			<ShareProjectModal />
			<ShareRequiresCloudModal />
			<AnalysisResult />
			{showDraftDialog && <DraftRecoveryDialog onOpen={handleDraftOpen} />}
			<DraftConflictDialog />
		</ProjectContext.Provider>
	);
};

export const useProjectContext = () => useContext(ProjectContext);

export function useProjectStore<T>(selector: (state: ProjectStoreState) => T) {
	const store = useProjectContext();
	if (!store) {
		throw new Error(
			"useProjectStore must be used within a ProjectContextProvider",
		);
	}
	return useStore(store, selector);
}
