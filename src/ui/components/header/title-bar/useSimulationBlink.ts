import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import { SimulationMode } from "@/ui/stores/project/simulation-mode.enum";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";

export const RUNNING_BACKGROUND_COLOR = "#2e7d32";
export const RUNNING_BLINK_BACKGROUND_COLOR = "#0b2e0f";

/**
 * Whether a local PLC simulation is in progress (observing a board runs none) and which phase of
 * its blink the indicator is in. It blinks only during a continuous simulation, to show that
 * cycles are running: step by step or paused, nothing moves until asked, so the colour is fixed.
 */
export default function useSimulationBlink(): {
	running: boolean;
	blinkOff: boolean;
} {
	const { mode, kind, simulationMode, simulationPaused } = useProjectStore(
		useShallow((state) => ({
			mode: state.mode,
			kind: state.simulationKind,
			simulationMode: state.simulationMode,
			simulationPaused: state.simulationPaused,
		})),
	);
	const [blinkOff, setBlinkOff] = useState(false);
	const running = mode === ProjectMode.SIMULATION && kind !== "observation";
	const blinking =
		running &&
		simulationMode === SimulationMode.CONTINUOUS &&
		!simulationPaused;

	useEffect(() => {
		if (!blinking) {
			setBlinkOff(false);
			return;
		}
		const interval = setInterval(() => setBlinkOff((off) => !off), 500);
		return () => clearInterval(interval);
	}, [blinking]);

	return { running, blinkOff };
}
