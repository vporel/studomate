"use client";

import { Box } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import AccountsSection from "./sections/AccountsSection";
import AnalysisSection from "./sections/AnalysisSection";
import CrossReferencesSection from "./sections/CrossReferencesSection";
import ExplorerSection from "./sections/ExplorerSection";
import GettingStartedSection from "./sections/GettingStartedSection";
import GrafcetSection from "./sections/GrafcetSection";
import HmiSection from "./sections/HmiSection";
import HardwareSection from "./sections/HardwareSection";
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
 * Rendu après montage et placé après le contenu visible : le HTML serveur n'est pas dupliqué et
 * `getElementById` (ancres des sous-sections) retrouve l'élément visible en premier.
 */
export default function ManualContentIndex({
	onReady,
}: {
	onReady: (index: ManualContentIndex) => void;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	useEffect(() => {
		const container = containerRef.current;
		if (!mounted || !container) return;
		const index: ManualContentIndex = {};
		container.querySelectorAll<HTMLElement>("[id]").forEach((el) => {
			index[el.id] = (el.textContent ?? "").replace(/\s+/g, " ").trim();
		});
		onReady(index);
		// `onReady` est un setter d'état (stable), le contenu des sections est statique.
	}, [mounted, onReady]);

	if (!mounted) return null;

	return (
		<Box ref={containerRef} aria-hidden sx={{ display: "none" }}>
			<IntroSection />
			<GettingStartedSection />
			<ProjectsSection />
			<AccountsSection />
			<ExplorerSection />
			<VariablesSection />
			<GrafcetSection selected="grafcet" />
			<LadderSection selected="ladder" />
			<ToolbarSection />
			<CrossReferencesSection />
			<HmiSection selected="hmi" />
			<SimulationSection selected="simulation" />
			<AnalysisSection selected="analysis" />
			<HardwareSection />
			<ShortcutsSection />
		</Box>
	);
}
