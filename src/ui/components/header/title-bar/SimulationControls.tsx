"use client";

import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { SimulationMode } from "@/ui/stores/project/SimulationMode.enum";
import { IconButton, Tooltip } from "@mui/material";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import SkipNextRoundedIcon from "@mui/icons-material/SkipNextRounded";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";

const SimulationControls = () => {
	const { mode, simulationMode, simulationPaused, simulationManager } =
		useProjectStore(
			useShallow((state) => ({
				mode: state.mode,
				simulationMode: state.simulationMode,
				simulationPaused: state.simulationPaused,
				simulationManager: state.simulationManager,
			})),
		);

	if (mode !== ProjectMode.SIMULATION) return null;

	if (simulationMode === SimulationMode.CONTINUOUS) {
		return simulationPaused ? (
			<Tooltip title="Reprendre la simulation">
				<IconButton
					size="small"
					onClick={() => simulationManager.resumeSimulation()}
				>
					<PlayArrowRoundedIcon fontSize="small" />
				</IconButton>
			</Tooltip>
		) : (
			<Tooltip title="Mettre en pause">
				<IconButton
					size="small"
					onClick={() => simulationManager.pauseSimulation()}
				>
					<PauseRoundedIcon fontSize="small" />
				</IconButton>
			</Tooltip>
		);
	}

	if (simulationMode === SimulationMode.STEP_BY_STEP) {
		return (
			<Tooltip title="Avancer d'un cycle">
				<IconButton
					size="small"
					onClick={() => simulationManager.stepSimulation()}
				>
					<SkipNextRoundedIcon fontSize="small" />
				</IconButton>
			</Tooltip>
		);
	}

	return null;
};

export default SimulationControls;
