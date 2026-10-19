"use client";

import {
	getProjectEverSaved,
	setProjectEverSaved,
} from "@/persistence/preferences.storage";
import Project from "@/schemas/project/project.schema";
import { useAuthStore } from "@/ui/stores/auth/auth.store";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useEffect, useState } from "react";

export type RecentProjects =
	| { loading: true }
	| {
			loading: false;
			projects: Project[];
			total: number;
			/** The cloud projects could not be listed: `projects` only holds the local ones. */
			cloudUnavailable: boolean;
			/** A project was saved from this browser at some point, even if none is left. */
			returning: boolean;
	  };

/**
 * The `limit` most recently modified projects, local and cloud alike. Reloaded when the
 * signed-in user changes, since the cloud projects come and go with them, and when the Open
 * modal closes, since projects can be deleted or moved from it. A listing failure
 * reads as no project at all. Finding projects marks the browser as having saved one, for
 * projects saved before that mark existed. An unreachable cloud counts as returning, since the
 * missing projects may be there.
 */
export default function useRecentProjects(limit: number): RecentProjects {
	const projectRepository = useProjectStore((state) => state.projectRepository);
	const openModalVisible = useProjectStore(
		(state) => state.ui.openModalVisible,
	);
	const userId = useAuthStore((state) => state.user?.id ?? null);
	const [result, setResult] = useState<RecentProjects>({ loading: true });

	useEffect(() => {
		if (openModalVisible) return;
		let cancelled = false;
		void projectRepository
			.list()
			.catch((error: unknown) => {
				console.error("Failed to list projects:", error);
				return { projects: [], failed: undefined };
			})
			.then(({ projects, failed }) => {
				if (cancelled) return;
				const sorted = [...projects].sort(
					(a, b) =>
						b.lastModificationDate.getTime() - a.lastModificationDate.getTime(),
				);
				if (projects.length > 0) setProjectEverSaved();
				setResult({
					loading: false,
					projects: sorted.slice(0, limit),
					total: projects.length,
					cloudUnavailable: !!failed,
					returning: getProjectEverSaved() || projects.length > 0 || !!failed,
				});
			});
		return () => {
			cancelled = true;
		};
	}, [projectRepository, openModalVisible, userId, limit]);

	return result;
}
