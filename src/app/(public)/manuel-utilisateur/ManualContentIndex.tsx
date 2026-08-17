"use client";

import { Box } from "@mui/material";
import { useEffect, useRef } from "react";
import AnalysisSection from "./sections/AnalysisSection";
import ExplorerSection from "./sections/ExplorerSection";
import GettingStartedSection from "./sections/GettingStartedSection";
import GrafcetSection from "./sections/GrafcetSection";
import IntroSection from "./sections/IntroSection";
import LadderSection from "./sections/LadderSection";
import ProjectsSection from "./sections/ProjectsSection";
import ShortcutsSection from "./sections/ShortcutsSection";
import SimulationSection from "./sections/SimulationSection";
import ToolbarSection from "./sections/ToolbarSection";
import VariablesSection from "./sections/VariablesSection";

export type ManualContentIndex = Record<string, string>;

/**
 * Monte silencieusement le contenu de toutes les sections (chacune porte déjà son `id` propre,
 * voir `manual-sections.ts`) pour en extraire le texte et construire l'index de recherche. Le
 * DOM produit ici n'est jamais affiché : `ManualSections` reste seul responsable de l'affichage.
 */
export default function ManualContentIndex({
	onReady,
}: {
	onReady: (index: ManualContentIndex) => void;
}) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const index: ManualContentIndex = {};
		container.querySelectorAll<HTMLElement>("[id]").forEach((el) => {
			index[el.id] = (el.textContent ?? "").replace(/\s+/g, " ").trim();
		});
		onReady(index);
		// onReady n'est volontairement pas dans les dépendances : le contenu des sections est
		// statique, cet index ne doit être construit qu'une seule fois au montage.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<Box ref={containerRef} aria-hidden sx={{ display: "none" }}>
			<IntroSection />
			<GettingStartedSection />
			<ProjectsSection />
			<ExplorerSection />
			<VariablesSection />
			<GrafcetSection selected="grafcet" />
			<LadderSection selected="ladder" />
			<ToolbarSection />
			<SimulationSection selected="simulation" />
			<AnalysisSection selected="analysis" />
			<ShortcutsSection />
		</Box>
	);
}
