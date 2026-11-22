"use client";

import useWebSerialSupported from "@/ui/components/hardware/useWebSerialSupported";
import {
	modeChoiceOf,
	type ModeChoice,
} from "@/ui/stores/project/managers/mode.manager";
import { Box } from "@mui/material";
import { useT } from "@/ui/i18n/useT";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";

const DEFAULT_BACKGROUND_COLOR = "lightgray";
const OBSERVATION_MODE_BACKGROUND_COLOR = "lightblue";

const ProjectModeSwitcher = () => {
	const { mode, kind, hasBoard, modeManager } = useProjectStore(
		useShallow((state) => ({
			mode: state.mode,
			kind: state.simulationKind,
			hasBoard: !!state.project?.hardwareTarget,
			modeManager: state.modeManager,
		})),
	);
	const serialSupported = useWebSerialSupported() === true;
	const t = useT("chrome.mode");

	const choice = modeChoiceOf(mode, kind);
	const backgroundColor =
		choice === "OBSERVATION"
			? OBSERVATION_MODE_BACKGROUND_COLOR
			: DEFAULT_BACKGROUND_COLOR;
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
