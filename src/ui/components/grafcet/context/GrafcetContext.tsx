"use client";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { Dialect } from "@/expression-language/dialect.enum";
import {
	useProjectContext,
	useProjectStore,
} from "@/ui/components/projects/ProjectContext";
import {
	createGrafcetStore,
	GrafcetStoreState,
} from "@/ui/stores/grafcet/grafcet.store";
import mitt, { Emitter } from "mitt";
import {
	createContext,
	ReactNode,
	useContext,
	useEffect,
	useMemo,
	useRef,
} from "react";
import { StoreApi, useStore } from "zustand";
import { GrafcetContextMenuEvents } from "./context-menu-events";
import { syncGrafcetToProject } from "./grafcet-project-sync";

type GrafcetContextType = {
	contextMenuEvents: Emitter<GrafcetContextMenuEvents>;
	store: StoreApi<GrafcetStoreState> | null;
};

const GrafcetContext = createContext<GrafcetContextType>({
	contextMenuEvents: mitt<GrafcetContextMenuEvents>(),
	store: null,
});

export const GrafcetContextProvider = ({
	initialGrafcet,
	children,
}: {
	initialGrafcet: Grafcet;
	children: ReactNode;
}) => {
	const grafcetsManager = useProjectStore((state) => state.grafcetsManager);
	const projectStore = useProjectContext();
	const storeRef = useRef<StoreApi<GrafcetStoreState> | null>(null);

	if (!storeRef.current) {
		//The undo history is owned by the project, so that closing this page does not lose it
		storeRef.current = createGrafcetStore(
			initialGrafcet,
			grafcetsManager.getCommandsStack(initialGrafcet.id),
			//Lu à la demande : le dialecte peut changer pendant la vie de la page
			() => projectStore?.getState().project?.dialect ?? Dialect.FR,
		);
	}
	const contextMenuEvents = useMemo(() => mitt<GrafcetContextMenuEvents>(), []);

	//Listen to grafcet changes
	useEffect(() => {
		if (!storeRef.current) return;
		const unsubscribe = syncGrafcetToProject(storeRef.current, grafcetsManager);
		return () => {
			unsubscribe();
		};
	}, [grafcetsManager]);

	//Register the store actions in the project store so they can be accessed from other components
	useEffect(() => {
		if (!storeRef.current) return;
		const grafcetId = storeRef.current.getState().grafcet.id;
		grafcetsManager.registerStoreManager(grafcetId, {
			viewManager: storeRef.current.getState().viewManager,
			copyCutPasteManager: storeRef.current.getState().copyCutPasteManager,
			commandsStackManager: storeRef.current.getState().commandsStackManager,
			workflowManager: storeRef.current.getState().workflowManager,
		});
		return () => {
			storeRef.current?.getState().viewManager.dispose();
			grafcetsManager.deleteStoreManager(grafcetId);
		};
	}, [grafcetsManager]);

	const contextValue = useMemo(
		() => ({ contextMenuEvents, store: storeRef.current }),
		[contextMenuEvents],
	);

	return (
		<GrafcetContext.Provider value={contextValue}>
			{children}
		</GrafcetContext.Provider>
	);
};

export const useGrafcetContext = () => useContext(GrafcetContext);

export function useGrafcetStore<T>(selector: (state: GrafcetStoreState) => T) {
	const { store } = useGrafcetContext();
	if (!store) {
		throw new Error(
			"useGrafcetStore must be used within a GrafcetContextProvider",
		);
	}
	return useStore(store, selector);
}
