"use client";
import { useProjectStore } from "@/components/projects/ProjectContext";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import { createGrafcetStore } from "@/stores/grafcet/grafcet-store";
import { GrafcetStoreState } from "@/stores/grafcet/grafcet-store-types";
import mitt, { Emitter } from "mitt";
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef } from "react";
import { StoreApi, useStore } from "zustand";
import { GrafcetContextMenuEvents } from "./context-menu-events";

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
	const storeRef = useRef<StoreApi<GrafcetStoreState> | null>(null);

	if (!storeRef.current) {
		storeRef.current = createGrafcetStore(initialGrafcet);
	}

	const grafcetsManager = useProjectStore((state) => state.grafcetsManager);
	const contextMenuEvents = useMemo(() => mitt<GrafcetContextMenuEvents>(), []);

	//Listen to grafcet changes
	useEffect(() => {
		if (!storeRef.current) return;
		const unsubscribe = storeRef.current.subscribe((state) => {
			grafcetsManager.updateGrafcetData(state.grafcet);
			grafcetsManager.setGrafcetStoreValues(state.grafcet.id, {
				hasCommandsToUndo: state.hasCommandsToUndo,
				hasCommandsToRedo: state.hasCommandsToRedo,
			});
		});
		return () => {
			unsubscribe();
		};
	}, [grafcetsManager]);

	//Register the store actions in the project store so they can be accessed from other components
	useEffect(() => {
		if (!storeRef.current) return;
		const grafcetId = storeRef.current.getState().grafcet.id;
		grafcetsManager.registerGrafcetStoreManager(grafcetId, {
			viewManager: storeRef.current.getState().viewManager,
			copyCutPasteManager: storeRef.current.getState().copyCutPasteManager,
			commandsStackManager: storeRef.current.getState().commandsStackManager,
		});
		return () => {
			grafcetsManager.deleteGrafcetStoreManager(grafcetId);
		};
	}, [grafcetsManager]);

	return (
		<GrafcetContext.Provider
			value={{
				contextMenuEvents,
				store: storeRef.current,
			}}
		>
			{children}
		</GrafcetContext.Provider>
	);
};

export const useGrafcetContext = () => useContext(GrafcetContext);

export function useGrafcetStore<T>(selector: (state: GrafcetStoreState) => T) {
	const { store } = useGrafcetContext();
	if (!store) {
		throw new Error("useGrafcetStore must be used within a GrafcetContextProvider");
	}
	return useStore(store, selector);
}
