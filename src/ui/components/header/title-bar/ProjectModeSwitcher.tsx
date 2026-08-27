"use client";

import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { SimulationMode } from "@/ui/stores/project/SimulationMode.enum";
import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";

const DESIGN_MODE_BACKGROUND_COLOR = "lightgray";
const SIMULATION_MODE_BACKGROUND_COLOR = "orange";

const ProjectModeSwitcher = () => {
	const { mode, simulationMode, simulationManager } = useProjectStore(
		useShallow((state) => ({
			mode: state.mode,
			simulationMode: state.simulationMode,
			simulationManager: state.simulationManager,
		})),
	);
	const [blinkOff, setBlinkOff] = useState(false);

	// Le sélecteur clignote uniquement en simulation continue, pour signaler que des cycles
	// s'enchaînent. En pas-à-pas rien ne bouge tant qu'on ne le demande pas : couleur fixe.
	const blinking =
		mode === ProjectMode.SIMULATION &&
		simulationMode === SimulationMode.CONTINUOUS;

	useEffect(() => {
		if (!blinking) {
			setBlinkOff(false);
			return;
		}
		const interval = setInterval(() => setBlinkOff((off) => !off), 500);
		return () => clearInterval(interval);
	}, [blinking]);

	const backgroundColor =
		mode === ProjectMode.SIMULATION && !blinkOff
			? SIMULATION_MODE_BACKGROUND_COLOR
			: DESIGN_MODE_BACKGROUND_COLOR;

	return (
		<Box
			component="select"
			value={mode}
			onChange={(e) => {
				if (e.target.value === "DESIGN") {
					simulationManager.setDesignMode();
				} else if (e.target.value === "SIMULATION") {
					simulationManager.setSimulationMode();
				}
			}}
			sx={{
				padding: "2px",
				borderRadius: "5px",
				fontSize: "0.8rem",
				cursor: "pointer",
				userSelect: "none",
				backgroundColor: backgroundColor,
			}}
		>
			<option value="DESIGN">Conception</option>
			<option value="SIMULATION">Simulation</option>
		</Box>
	);
};

export default ProjectModeSwitcher;
