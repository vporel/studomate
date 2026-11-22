"use client";

import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import { Button, Tooltip } from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
import {
	MODE_CONTROL_BORDER_RADIUS,
	MODE_CONTROL_FONT_SIZE,
	MODE_CONTROL_HEIGHT,
} from "./mode-control-style";
import useSimulationBlink, {
	RUNNING_BACKGROUND_COLOR,
	RUNNING_BLINK_BACKGROUND_COLOR,
} from "./useSimulationBlink";

/** Starts the simulation from design mode, and brings the project back to design from any simulation. */
const SimulationToggleButton = () => {
	const t = useT("chrome.mode");
	const { mode, modeManager } = useProjectStore(
		useShallow((state) => ({
			mode: state.mode,
			modeManager: state.modeManager,
		})),
	);
	const { running, blinkOff } = useSimulationBlink();
	const designing = mode === ProjectMode.DESIGN;

	return (
		<Tooltip describeChild title={designing ? t("startHint") : t("stopHint")}>
			<Button
				size="small"
				variant={designing || running ? "contained" : "outlined"}
				color={designing ? "primary" : "inherit"}
				startIcon={designing ? <PlayArrowRoundedIcon /> : <StopRoundedIcon />}
				disableElevation
				sx={{
					height: MODE_CONTROL_HEIGHT,
					py: 0,
					fontSize: MODE_CONTROL_FONT_SIZE,
					borderRadius: MODE_CONTROL_BORDER_RADIUS,
					whiteSpace: "nowrap",
				}}
				style={
					running
						? {
								backgroundColor: blinkOff
									? RUNNING_BLINK_BACKGROUND_COLOR
									: RUNNING_BACKGROUND_COLOR,
								color: "white",
							}
						: undefined
				}
				onClick={() =>
					void modeManager.select(designing ? "SIMULATION" : "DESIGN")
				}
			>
				{designing ? t("start") : t("stop")}
			</Button>
		</Tooltip>
	);
};

export default SimulationToggleButton;
