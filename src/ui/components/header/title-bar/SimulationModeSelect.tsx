"use client";

import { SimulationMode } from "@/ui/stores/project/SimulationMode.enum";
import { Box } from "@mui/material";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";

const SimulationModeSelect = () => {
	const simulationMode = useProjectStore((state) => state.simulationMode);
	const simulationManager = useProjectStore((state) => state.simulationManager);

	return (
		<Box
			component="select"
			value={simulationMode}
			onChange={(e) => {
				simulationManager.setPlcSimulationMode(
					e.target.value as SimulationMode,
				);
			}}
			sx={{
				padding: "2px",
				borderRadius: "5px",
				fontSize: "0.8rem",
				cursor: "pointer",
				userSelect: "none",
				backgroundColor: "lightgray",
			}}
		>
			<option value={SimulationMode.CONTINUOUS}>Continu</option>
			<option value={SimulationMode.STEP_BY_STEP}>Pas-à-pas</option>
		</Box>
	);
};

export default SimulationModeSelect;
