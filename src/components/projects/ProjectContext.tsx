"use client";
import { createProjectStore } from "@/stores/project/project-store";
import { ProjectStoreState } from "@/stores/project/project-store-types";
import { createContext, ReactNode, useContext, useEffect, useRef } from "react";
import { StoreApi, useStore } from "zustand";
import UnsavedChangesDialog from "../dialogs/UnsavedChangesDialog";
import ProjectOpenModal from "./ProjectOpenModal";
import useShortcutsHandler from "./useShortcutsHandler";

const ProjectContext = createContext<StoreApi<ProjectStoreState> | null>(null);

function ShortcutsHandler() {
	useShortcutsHandler();
	return null;
}

export const ProjectContextProvider = ({ children }: { children: ReactNode }) => {
	const storeRef = useRef<StoreApi<ProjectStoreState> | null>(null);

	if (!storeRef.current) {
		storeRef.current = createProjectStore();
	}

	//Show a browser dialog when the user tries to close the tab or refresh the page with unsaved changes
	useEffect(() => {
		const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
			e.preventDefault();
		};

		window.addEventListener("beforeunload", beforeUnloadHandler);
		return () => {
			window.removeEventListener("beforeunload", beforeUnloadHandler);
		};
	}, []);

	return (
		<ProjectContext.Provider value={storeRef.current}>
			{children}
			<ShortcutsHandler />
			<UnsavedChangesDialog message="Voulez-vous enregistrer les modifications avant de quitter le projet ?" />
			<ProjectOpenModal />
		</ProjectContext.Provider>
	);
};

export const useProjectContext = () => useContext(ProjectContext);

export function useProjectStore<T>(selector: (state: ProjectStoreState) => T) {
	const store = useProjectContext();
	if (!store) {
		throw new Error("useProjectStore must be used within a ProjectContextProvider");
	}
	return useStore(store, selector);
}
