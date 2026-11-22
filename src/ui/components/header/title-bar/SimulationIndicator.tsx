"use client";

import { Box } from "@mui/material";
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

/** Shows that a simulation is in progress, without offering to stop it. */
const SimulationIndicator = () => {
	const t = useT("chrome.mode");
	const { running, blinkOff } = useSimulationBlink();

	if (!running) return null;

	return (
		<Box
			role="status"
			sx={{
				height: MODE_CONTROL_HEIGHT,
				display: "flex",
				alignItems: "center",
				px: 1.5,
				borderRadius: MODE_CONTROL_BORDER_RADIUS,
				fontSize: MODE_CONTROL_FONT_SIZE,
				fontWeight: 500,
				color: "white",
				userSelect: "none",
				backgroundColor: blinkOff
					? RUNNING_BLINK_BACKGROUND_COLOR
					: RUNNING_BACKGROUND_COLOR,
			}}
		>
			{t("simulation")}
		</Box>
	);
};

export default SimulationIndicator;
