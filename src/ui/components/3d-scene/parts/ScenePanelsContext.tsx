"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { isPanelCollapsedByDefault } from "./scene-panels-state";

type ScenePanels = {
	isCollapsed: (index: number) => boolean;
	toggle: (index: number) => void;
};

const ScenePanelsContext = createContext<ScenePanels | null>(null);

/** Rank of a panel among those of the controls it belongs to. */
export const ConsolePanelIndexContext = createContext(0);

/**
 * Which panels of a scene are folded. It lives as long as the scene is shown: it is lost when the
 * scene is closed, moved to another display mode, or the page reloaded.
 *
 * @param foldPanels Only the first panel starts open.
 */
export default function ScenePanelsProvider({
	foldPanels,
	children,
}: {
	foldPanels: boolean;
	children: ReactNode;
}) {
	const [overrides, setOverrides] = useState<Record<number, boolean>>({});
	const isCollapsed = useCallback(
		(index: number) =>
			overrides[index] ?? isPanelCollapsedByDefault(foldPanels, index),
		[overrides, foldPanels],
	);
	const toggle = useCallback(
		(index: number) =>
			setOverrides((current) => ({
				...current,
				[index]: !(
					current[index] ?? isPanelCollapsedByDefault(foldPanels, index)
				),
			})),
		[foldPanels],
	);
	const value = useMemo(() => ({ isCollapsed, toggle }), [isCollapsed, toggle]);
	return (
		<ScenePanelsContext.Provider value={value}>
			{children}
		</ScenePanelsContext.Provider>
	);
}

export function useScenePanels(): ScenePanels {
	const context = useContext(ScenePanelsContext);
	if (!context) {
		throw new Error("Console panels must be inside a ScenePanelsProvider");
	}
	return context;
}
