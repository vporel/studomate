"use client";
import Ladder from "@/schemas/ladder/ladder.schema";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { createLadderStore, LadderStoreState } from "@/ui/stores/ladder/ladder.store";
import mitt, { Emitter } from "mitt";
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef } from "react";
import { StoreApi, useStore } from "zustand";
import { LadderContextMenuEvents } from "./context-menu-events";
import { syncLadderToProject } from "./ladder-project-sync";

type LadderContextType = {
	contextMenuEvents: Emitter<LadderContextMenuEvents>;
	store: StoreApi<LadderStoreState> | null;
};

const LadderContext = createContext<LadderContextType>({
	contextMenuEvents: mitt<LadderContextMenuEvents>(),
	store: null,
});

export const LadderContextProvider = ({
	initialLadder,
	children,
}: {
	initialLadder: Ladder;
	children: ReactNode;
}) => {
	const laddersManager = useProjectStore((state) => state.laddersManager);
	const storeRef = useRef<StoreApi<LadderStoreState> | null>(null);

	if (!storeRef.current) {
		//The undo history is owned by the project, so that closing this page does not lose it
		storeRef.current = createLadderStore(initialLadder, laddersManager.getCommandsStack(initialLadder.id));
	}
	const contextMenuEvents = useMemo(() => mitt<LadderContextMenuEvents>(), []);

	useEffect(() => {
		if (!storeRef.current) return;
		const unsubscribe = syncLadderToProject(storeRef.current, laddersManager);
		return () => {
			unsubscribe();
		};
	}, [laddersManager]);

	useEffect(() => {
		if (!storeRef.current) return;
		const ladderId = storeRef.current.getState().ladder.id;
		laddersManager.registerStoreManager(ladderId, {
			commandsStackManager: storeRef.current.getState().commandsStackManager,
			viewManager: storeRef.current.getState().viewManager,
			copyCutPasteManager: storeRef.current.getState().copyCutPasteManager,
			workflowManager: storeRef.current.getState().workflowManager,
		});
		return () => {
			storeRef.current?.getState().viewManager.dispose();
			laddersManager.deleteStoreManager(ladderId);
		};
	}, [laddersManager]);

	const contextValue = useMemo(
		() => ({ contextMenuEvents, store: storeRef.current }),
		[contextMenuEvents],
	);

	return <LadderContext.Provider value={contextValue}>{children}</LadderContext.Provider>;
};

export const useLadderContext = () => useContext(LadderContext);

export function useLadderStore<T>(selector: (state: LadderStoreState) => T) {
	const { store } = useLadderContext();
	if (!store) {
		throw new Error("useLadderStore must be used within a LadderContextProvider");
	}
	return useStore(store, selector);
}
