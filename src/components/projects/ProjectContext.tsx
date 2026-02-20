"use client";
import { createProjectStore } from "@/stores/project/project-store";
import { ProjectStoreState } from "@/stores/project/project-store-types";
import { createContext, ReactNode, useContext, useEffect, useRef } from "react";
import { StoreApi, useStore } from "zustand";
import ExportModal from "./ExportModal";
import ProjectOpenModal from "./ProjectOpenModal";
import UnsavedChangesDialog from "./ProjectUnsavedChangesDialog";
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

	//Constantly update the mouse position in the store to be able to paste elements at the right position
	useEffect(() => {
		const handleMouseMove = (event: MouseEvent) => {
			storeRef.current?.setState({ mousePosition: { x: event.clientX, y: event.clientY } });
		};
		window.addEventListener("mousemove", handleMouseMove);
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
		};
	}, []);

	return (
		<ProjectContext.Provider value={storeRef.current}>
			{children}
			<ShortcutsHandler />
			<UnsavedChangesDialog />
			<ProjectOpenModal />
			<ExportModal />
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
