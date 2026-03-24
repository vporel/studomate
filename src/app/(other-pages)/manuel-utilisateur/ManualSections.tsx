"use client";

import { Box } from "@mui/material";
import AnalysisSection from "./sections/AnalysisSection";
import ExplorerSection from "./sections/ExplorerSection";
import GettingStartedSection from "./sections/GettingStartedSection";
import GrafcetSection from "./sections/GrafcetSection";
import IntroSection from "./sections/IntroSection";
import ProjectsSection from "./sections/ProjectsSection";
import ShortcutsSection from "./sections/ShortcutsSection";
import SimulationSection from "./sections/SimulationSection";
import ToolbarSection from "./sections/ToolbarSection";
import VariablesSection from "./sections/VariablesSection";

export default function ManualSections({ selected }: { selected: string }) {
	const isGrafcetSection = selected === "grafcet" || selected.startsWith("grafcet-");

	return (
		<Box sx={{ flex: 1 }}>
			{selected === "intro" && <IntroSection />}
			{selected === "getting-started" && <GettingStartedSection />}
			{selected === "projects" && <ProjectsSection />}
			{selected === "explorer" && <ExplorerSection />}
			{selected === "variables" && <VariablesSection />}
			{isGrafcetSection && <GrafcetSection selected={selected} />}
			{selected === "toolbar" && <ToolbarSection />}
			{selected === "simulation" && <SimulationSection />}
			{selected === "analysis" && <AnalysisSection />}
			{selected === "shortcuts" && <ShortcutsSection />}
		</Box>
	);
}
