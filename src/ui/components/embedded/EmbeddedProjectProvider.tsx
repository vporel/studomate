"use client";

import type { Locale } from "@/i18n/config";
import { useT } from "@/ui/i18n/useT";
import createEmbeddedProjectStoreEnvironment from "@/ui/stores/project/environment/embedded-project-store-environment";
import {
	createContext,
	ReactNode,
	useContext,
	useEffect,
	useLayoutEffect,
	useRef,
} from "react";
import { useLocale } from "next-intl";
import {
	ProjectStoreProvider,
	useProjectStoreInstance,
} from "../projects/ProjectContext";
import followModeWithHmiSimulationTab from "./follow-mode-with-hmi-simulation-tab";
import type { EmbeddedAppProps } from "./embedded-app.types";
import resolveEmbeddedViews, {
	type ResolvedEmbeddedView,
} from "./resolve-embedded-views";

const EmbeddedViewsContext = createContext<ResolvedEmbeddedView[]>([]);

/** The tabs of the block, resolved once from the views asked for. */
export const useEmbeddedViews = () => useContext(EmbeddedViewsContext);

type EmbeddedProjectProviderProps = Pick<
	EmbeddedAppProps,
	| "project"
	| "views"
	| "initialView"
	| "initialMode"
	| "editable"
	| "watchOpen"
	| "warnOnLeave"
	| "onDirtyChange"
> & { children: ReactNode };

/**
 * Owns the store of one block. The project is copied and opened once, at the first render (the
 * `project` and `views` props are not read again); the simulation it starts is stopped when the
 * block unmounts.
 */
export default function EmbeddedProjectProvider({
	project,
	views,
	initialView,
	initialMode = "design",
	editable = true,
	watchOpen = false,
	warnOnLeave = false,
	onDirtyChange,
	children,
}: EmbeddedProjectProviderProps) {
	const locale = useLocale() as Locale;
	const t = useT("embedded");
	const resolvedRef = useRef<ResolvedEmbeddedView[]>([]);

	const store = useProjectStoreInstance(
		() => createEmbeddedProjectStoreEnvironment({ locale }),
		(created) => {
			const opened = project.copy();
			const titles = {
				unavailable: t("tabs.unavailable"),
				scene3d: t("tabs.scene3d"),
			};
			resolvedRef.current = resolveEmbeddedViews(opened, views, titles);
			const [initial] = initialView
				? resolveEmbeddedViews(opened, [initialView], titles)
				: [];
			created.getState().setEditingEnabled(editable);
			created.getState().lifecycleManager.openProjectInstance(
				opened,
				resolvedRef.current.map((view) => view.page),
				initial && !initial.problem ? initial.page.id : undefined,
			);
		},
	);

	useEffect(() => {
		store.getState().setEditingEnabled(editable);
	}, [store, editable]);

	//Before the first paint: the block never shows its design mode on its way to the simulation.
	useLayoutEffect(() => {
		const { simulationManager, scene3dLinkManager } = store.getState();
		const stopFollowingMode = followModeWithHmiSimulationTab(store);
		if (initialMode === "simulation" && simulationManager.setSimulationMode()) {
			if (watchOpen) store.getState().setWatchTablesVisible(true);
		}
		return () => {
			stopFollowingMode();
			simulationManager.setDesignMode();
			scene3dLinkManager.close();
		};
		// The initial mode and watch panel only apply when the block mounts.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [store]);

	const onDirtyChangeRef = useRef(onDirtyChange);
	useEffect(() => {
		onDirtyChangeRef.current = onDirtyChange;
	}, [onDirtyChange]);
	useEffect(
		() =>
			store.subscribe((state, previous) => {
				if (state.hasUnsavedChanges !== previous.hasUnsavedChanges) {
					onDirtyChangeRef.current?.(state.hasUnsavedChanges);
				}
			}),
		[store],
	);

	useEffect(() => {
		if (!warnOnLeave) return;
		const confirmLeave = (event: BeforeUnloadEvent) => {
			if (store.getState().hasUnsavedChanges) event.preventDefault();
		};
		window.addEventListener("beforeunload", confirmLeave);
		return () => window.removeEventListener("beforeunload", confirmLeave);
	}, [store, warnOnLeave]);

	return (
		<ProjectStoreProvider store={store}>
			<EmbeddedViewsContext.Provider value={resolvedRef.current}>
				{children}
			</EmbeddedViewsContext.Provider>
		</ProjectStoreProvider>
	);
}
