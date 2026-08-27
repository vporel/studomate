"use client";

import { Box } from "@mui/material";
import AnalysisSection from "./sections/AnalysisSection";
import ExplorerSection from "./sections/ExplorerSection";
import GettingStartedSection from "./sections/GettingStartedSection";
import GrafcetSection from "./sections/GrafcetSection";
import IntroSection from "./sections/IntroSection";
import HmiSection from "./sections/HmiSection";
import LadderSection from "./sections/LadderSection";
import ProjectsSection from "./sections/ProjectsSection";
import ShortcutsSection from "./sections/ShortcutsSection";
import SimulationSection from "./sections/SimulationSection";
import ToolbarSection from "./sections/ToolbarSection";
import VariablesSection from "./sections/VariablesSection";

const isSectionOrChild = (selected: string, id: string) =>
	selected === id || selected.startsWith(`${id}-`);

export default function ManualSections({ selected }: { selected: string }) {
	return (
		<Box sx={{ flex: 1 }}>
			{selected === "intro" && <IntroSection />}
			{selected === "getting-started" && <GettingStartedSection />}
			{selected === "projects" && <ProjectsSection />}
			{selected === "explorer" && <ExplorerSection />}
			{selected === "variables" && <VariablesSection />}
			{isSectionOrChild(selected, "grafcet") && (
				<GrafcetSection selected={selected} />
			)}
			{isSectionOrChild(selected, "ladder") && (
				<LadderSection selected={selected} />
			)}
			{selected === "toolbar" && <ToolbarSection />}
			{isSectionOrChild(selected, "hmi") && <HmiSection selected={selected} />}
			{isSectionOrChild(selected, "simulation") && (
				<SimulationSection selected={selected} />
			)}
			{isSectionOrChild(selected, "analysis") && (
				<AnalysisSection selected={selected} />
			)}
			{selected === "shortcuts" && <ShortcutsSection />}
		</Box>
	);
}
