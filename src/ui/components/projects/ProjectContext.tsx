"use client";
import {
	createProjectStore,
	ProjectStoreState,
} from "@/ui/stores/project/project.store";
import type { ProjectStoreEnvironment } from "@/ui/stores/project/environment/project-store-environment";
import { createContext, ReactNode, useContext, useRef } from "react";
import { StoreApi, useStore } from "zustand";

const ProjectContext = createContext<StoreApi<ProjectStoreState> | null>(null);

/**
 * Creates, once per mount, the store built on the environment `createEnvironment` returns, and
 * hands it to `initialize` before anything renders from it.
 */
export function useProjectStoreInstance(
	createEnvironment: () => ProjectStoreEnvironment,
	initialize?: (store: StoreApi<ProjectStoreState>) => void,
): StoreApi<ProjectStoreState> {
	const storeRef = useRef<StoreApi<ProjectStoreState> | null>(null);
	if (!storeRef.current) {
		storeRef.current = createProjectStore(createEnvironment());
		initialize?.(storeRef.current);
	}
	return storeRef.current;
}

export const ProjectStoreProvider = ({
	store,
	children,
}: {
	store: StoreApi<ProjectStoreState>;
	children: ReactNode;
}) => (
	<ProjectContext.Provider value={store}>{children}</ProjectContext.Provider>
);

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
