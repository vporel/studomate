"use client";

import routes from "@/app/routes";
import type { Locale } from "@/i18n/config";
import type { PagesSession } from "@/persistence/pages-session.storage";
import type Project from "@/schemas/project/project.schema";
import { saveHandoff } from "@/persistence/handoff.storage";
import { PROJECT_TEMPLATES } from "@/templates";
import localizeProject from "@/templates/localize-project";
import EmbeddedApp from "@/ui/components/embedded/EmbeddedApp";
import type { EmbeddedView } from "@/ui/components/embedded/embedded-app.types";
import {
	getVariablesPageDefinition,
	type VariablesPageId,
} from "@/ui/stores/project/variables-pages";
import { TRAINING_EMBEDDED_HEIGHT } from "./training-embedded-height";
import { useMemo } from "react";

/** Picks the view displayed first: the first one of this kind among the views offered. */
export type TrainingInitialView =
	| { type: "grafcet" | "ladder" | "hmi" }
	| { type: "variables"; pageId: VariablesPageId };

function matchesInitialView(view: EmbeddedView, initial: TrainingInitialView) {
	if (view.type !== initial.type) return false;
	return (
		view.type !== "variables" ||
		(initial.type === "variables" && view.pageId === initial.pageId)
	);
}

/**
 * A template running in the page: its solution in simulation and read-only, or its exercise
 * (the statement to complete) editable in design mode, with the input and output variables it
 * provides shown before the programs, on the first program.
 */
export default function TrainingEmbeddedBlock({
	templateId,
	locale,
	variant = "solution",
	initialView,
	scene3d = false,
	watchOpen = false,
}: {
	templateId: string;
	locale: Locale;
	variant?: "solution" | "exercise";
	/** The view displayed first; the first view offered when absent or not found. */
	initialView?: TrainingInitialView;
	/** The 3D scene of the template is offered as a tab. A template with a scene needs it to be
	 * driven: its sensors lock the inputs they drive. */
	scene3d?: boolean;
	/** Solution only: the watch table is open when the simulation starts. */
	watchOpen?: boolean;
}) {
	const exercise = variant === "exercise";
	const project = useMemo(() => {
		const template = PROJECT_TEMPLATES.find((t) => t.id === templateId);
		const build = exercise ? template?.create : template?.solution;
		if (!template || !build) return null;
		const built = build(locale);
		localizeProject(built, locale, { keep: template.keepMnemonics });
		return built;
	}, [templateId, locale, exercise]);

	if (!project) return null;
	const templateLink = `${routes.app()}?template=${templateId}&template-locale=${locale}`;
	const exerciseHref = (current: Project, pages: PagesSession) => {
		const handoffId = saveHandoff({
			project: current,
			templateId,
			locale,
			pages,
		});
		return handoffId ? `${routes.app()}?handoff=${handoffId}` : templateLink;
	};
	const grafcetViews: EmbeddedView[] = Object.keys(project.grafcets).map(
		(id) => ({ type: "grafcet" as const, id }),
	);
	const views: EmbeddedView[] = [
		...(exercise
			? (["input-variables", "output-variables"] as const)
					.filter((pageId) =>
						project.variables.some((variable) =>
							(
								getVariablesPageDefinition(pageId).zones as readonly string[]
							).includes(variable.zone),
						),
					)
					.map((pageId) => ({
						type: "variables" as const,
						pageId,
						locked: true,
					}))
			: []),
		...grafcetViews,
		...Object.values(project.ladders)
			.filter(
				(ladder) =>
					!ladder.isEmpty() ||
					(exercise && ladder.isMain() && grafcetViews.length === 0),
			)
			.map(({ id }) => ({ type: "ladder" as const, id })),
		...Object.keys(project.hmiPages).map((pageId) => ({
			type: "hmi" as const,
			pageId,
			locked: true,
		})),
		...(scene3d && project.scene3d ? [{ type: "scene3d" as const }] : []),
	];
	return (
		<EmbeddedApp
			project={project}
			initialMode={exercise ? "design" : "simulation"}
			watchOpen={watchOpen}
			editable={exercise}
			controls={
				exercise
					? [
							"mode",
							"simulation",
							"history",
							"dialect",
							"watch",
							"analysis",
							"openInApp",
							"fullscreen",
						]
					: [
							"mode",
							"simulation",
							"watch",
							"analysis",
							"openInApp",
							"fullscreen",
						]
			}
			appHref={
				exercise
					? exerciseHref
					: `${templateLink}&template-mode=solution&template-autostart=simulation`
			}
			views={views}
			initialView={
				initialView && views.find((v) => matchesInitialView(v, initialView))
			}
			height={TRAINING_EMBEDDED_HEIGHT}
		/>
	);
}
