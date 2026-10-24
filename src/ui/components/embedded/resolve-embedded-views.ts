import type Project from "@/schemas/project/project.schema";
import { getVariablesPageData } from "@/ui/stores/project/pages-data";
import type { PageData } from "@/ui/stores/project/project.store.types";
import type { EmbeddedView } from "./embedded-app.types";

export type EmbeddedViewProblem = {
	reason: "grafcet" | "ladder" | "hmi" | "scene3d" | "unknown";
	id?: string;
};

export type ResolvedEmbeddedView = {
	page: PageData;
	/** Set when the view cannot be shown: its tab then displays the problem. */
	problem?: EmbeddedViewProblem;
};

export const EMBEDDED_UNAVAILABLE_PAGE_PREFIX = "embedded-unavailable-";
export const EMBEDDED_SCENE_PAGE_ID = "embedded-scene3d";

export type EmbeddedViewTitles = {
	unavailable: string;
	scene3d: string;
};

/**
 * Turns the views asked for into the tabs of the block. A view that points at nothing in the
 * project becomes an `embedded-unavailable` tab instead of failing; a program or page shown
 * twice yields a single tab.
 */
export default function resolveEmbeddedViews(
	project: Project,
	views: EmbeddedView[],
	titles: EmbeddedViewTitles,
): ResolvedEmbeddedView[] {
	const resolved: ResolvedEmbeddedView[] = [];
	const seen = new Set<string>();
	const push = (view: ResolvedEmbeddedView, source?: EmbeddedView) => {
		if (seen.has(view.page.id)) return;
		seen.add(view.page.id);
		if (source?.locked) view.page.locked = true;
		resolved.push(view);
	};

	views.forEach((view, index) => {
		const unavailable = (problem: EmbeddedViewProblem) =>
			push({
				page: {
					id: `${EMBEDDED_UNAVAILABLE_PAGE_PREFIX}${index}`,
					type: "embedded-unavailable",
					title: titles.unavailable,
				},
				problem,
			});

		switch (view.type) {
			case "grafcet": {
				const grafcet = project.getGrafcet(view.id);
				if (!grafcet) return unavailable({ reason: "grafcet", id: view.id });
				return push(
					{ page: { id: grafcet.id, type: "grafcet", title: grafcet.name } },
					view,
				);
			}
			case "ladder": {
				const ladder = project.getLadder(view.id);
				if (!ladder) return unavailable({ reason: "ladder", id: view.id });
				return push(
					{ page: { id: ladder.id, type: "ladder", title: ladder.name } },
					view,
				);
			}
			case "hmi": {
				const hmiPage = project.getHmiPage(view.pageId);
				if (!hmiPage) return unavailable({ reason: "hmi", id: view.pageId });
				return push(
					{ page: { id: hmiPage.id, type: "hmi", title: hmiPage.name } },
					view,
				);
			}
			case "scene3d": {
				if (!project.scene3d) return unavailable({ reason: "scene3d" });
				return push({
					page: {
						id: EMBEDDED_SCENE_PAGE_ID,
						type: "scene3d-view",
						title: titles.scene3d,
					},
				});
			}
			case "variables":
				return push({ page: getVariablesPageData(view.pageId) }, view);
			default:
				return unavailable({ reason: "unknown" });
		}
	});
	return resolved;
}
