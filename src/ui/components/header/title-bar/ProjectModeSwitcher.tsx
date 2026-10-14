"use client";

import useWebSerialSupported from "@/ui/components/hardware/useWebSerialSupported";
import {
	modeChoiceOf,
	type ModeChoice,
} from "@/ui/stores/project/managers/mode.manager";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { SimulationMode } from "@/ui/stores/project/SimulationMode.enum";
import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import { useT } from "@/ui/i18n/useT";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";

const DESIGN_MODE_BACKGROUND_COLOR = "lightgray";
const SIMULATION_MODE_BACKGROUND_COLOR = "orange";
const OBSERVATION_MODE_BACKGROUND_COLOR = "lightblue";

const ProjectModeSwitcher = () => {
	const { mode, kind, simulationMode, hasBoard, modeManager } = useProjectStore(
		useShallow((state) => ({
			mode: state.mode,
			kind: state.simulationKind,
			simulationMode: state.simulationMode,
			hasBoard: !!state.project?.hardwareTarget,
			modeManager: state.modeManager,
		})),
	);
	const [blinkOff, setBlinkOff] = useState(false);
	const serialSupported = useWebSerialSupported() === true;
	const t = useT("chrome.mode");

	// Le sélecteur clignote uniquement en simulation continue d'un PLC local, pour signaler que des
	// cycles s'enchaînent. En pas-à-pas rien ne bouge tant qu'on ne le demande pas : couleur fixe.
	const blinking =
		mode === ProjectMode.SIMULATION &&
		kind !== "observation" &&
		simulationMode === SimulationMode.CONTINUOUS;

	useEffect(() => {
		if (!blinking) {
			setBlinkOff(false);
			return;
		}
		const interval = setInterval(() => setBlinkOff((off) => !off), 500);
		return () => clearInterval(interval);
	}, [blinking]);

	const choice = modeChoiceOf(mode, kind);
	const backgroundColor =
		choice === "OBSERVATION"
			? OBSERVATION_MODE_BACKGROUND_COLOR
			: mode === ProjectMode.SIMULATION && !blinkOff
				? SIMULATION_MODE_BACKGROUND_COLOR
				: DESIGN_MODE_BACKGROUND_COLOR;
	const boardModes = hasBoard && serialSupported;

	return (
		<Box
			component="select"
			value={choice}
			onChange={(e) => void modeManager.select(e.target.value as ModeChoice)}
			sx={{
				padding: "2px",
				borderRadius: "5px",
				fontSize: "0.8rem",
				cursor: "pointer",
				userSelect: "none",
				backgroundColor: backgroundColor,
			}}
		>
			<option value="DESIGN">{t("design")}</option>
			<option value="SIMULATION">{t("simulation")}</option>
			{boardModes && (
				<option value="SIMULATION_HARDWARE_IO">
					{t("simulationHardwareIo")}
				</option>
			)}
			{boardModes && <option value="OBSERVATION">{t("observation")}</option>}
		</Box>
	);
};

export default ProjectModeSwitcher;
