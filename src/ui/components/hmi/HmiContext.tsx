"use client";

import HmiPage from "@/schemas/hmi/hmi-page.schema";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { createHmiStore, HmiStoreState } from "@/ui/stores/hmi/hmi.store";
import { createContext, ReactNode, useContext, useEffect, useRef } from "react";
import { StoreApi, useStore } from "zustand";
import { syncHmiPageToProject } from "./hmi-project-sync";

const HmiContext = createContext<StoreApi<HmiStoreState> | null>(null);

export const HmiContextProvider = ({
	initialHmiPage,
	children,
}: {
	initialHmiPage: HmiPage;
	children: ReactNode;
}) => {
	const hmiManager = useProjectStore((state) => state.hmiManager);
	const storeRef = useRef<StoreApi<HmiStoreState> | null>(null);

	if (!storeRef.current) {
		//L'historique d'annulation est porté par le projet, pour ne pas le perdre à la fermeture
		//de cette page (voir HmiManager.getCommandsStack).
		storeRef.current = createHmiStore(
			initialHmiPage,
			hmiManager.getCommandsStack(initialHmiPage.id),
		);
	}

	useEffect(() => {
		if (!storeRef.current) return;
		const unsubscribe = syncHmiPageToProject(storeRef.current, hmiManager);
		return () => unsubscribe();
	}, [hmiManager]);

	//Enregistre les actions du store dans le store projet pour qu'elles soient accessibles
	//depuis d'autres composants (ex. le raccourci Ctrl+Z global, voir undo-redo.ts)
	useEffect(() => {
		if (!storeRef.current) return;
		const hmiPageId = storeRef.current.getState().hmiPage.id;
		hmiManager.registerStoreManager(hmiPageId, {
			commandsStackManager: storeRef.current.getState().commandsStackManager,
			copyCutPasteManager: storeRef.current.getState().copyCutPasteManager,
			selectAllWidgets: storeRef.current.getState().selectAllWidgets,
			removeSelectedWidgets: storeRef.current.getState().removeSelectedWidgets,
			moveSelectedWidgets: storeRef.current.getState().moveSelectedWidgets,
		});
		return () => {
			hmiManager.deleteStoreManager(hmiPageId);
		};
	}, [hmiManager]);

	return (
		<HmiContext.Provider value={storeRef.current}>
			{children}
		</HmiContext.Provider>
	);
};

export function useHmiStore<T>(selector: (state: HmiStoreState) => T): T {
	const store = useContext(HmiContext);
	if (!store)
		throw new Error("useHmiStore doit être utilisé dans HmiContextProvider");
	return useStore(store, selector);
}
