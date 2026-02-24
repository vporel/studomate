"use client";

import { ProjectMode } from "@/stores/project/ProjectMode.enum";
import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "../../projects/ProjectContext";

const DESIGN_MODE_BACKGROUND_COLOR = "lightgray";
const SIMULATION_MODE_BACKGROUND_COLOR = "orange";

const ProjectModeSwitcher = () => {
	const mode = useProjectStore(useShallow((state) => state.mode));
	const modeManager = useProjectStore(useShallow((state) => state.modeManager));
	const [backgroundColor, setBackgroundColor] = useState(DESIGN_MODE_BACKGROUND_COLOR);

	//Blink background color if in simulation mode, to make it more visible
	useEffect(() => {
		if (mode === ProjectMode.SIMULATION) {
			const interval = setInterval(() => {
				setBackgroundColor((prev) =>
					prev === DESIGN_MODE_BACKGROUND_COLOR
						? SIMULATION_MODE_BACKGROUND_COLOR
						: DESIGN_MODE_BACKGROUND_COLOR,
				);
			}, 500);
			return () => clearInterval(interval);
		} else {
			setBackgroundColor(DESIGN_MODE_BACKGROUND_COLOR);
		}
	}, [mode]);

	return (
		<Box
			component="select"
			value={mode}
			onChange={(e) => {
				if (e.target.value === "DESIGN") {
					modeManager.setDesignMode();
				} else if (e.target.value === "SIMULATION") {
					modeManager.setSimulationMode();
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
