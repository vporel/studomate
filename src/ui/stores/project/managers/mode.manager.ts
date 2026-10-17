import type { ProjectStoreGetFunction } from "@/ui/stores/project/project.store";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import type { SimulationKind } from "@/ui/stores/project/SimulationKind";

/** What the mode menu offers: who runs the logic, and where the inputs and outputs come from. */
export type ModeChoice =
	"DESIGN" | "SIMULATION" | "SIMULATION_HARDWARE_IO" | "OBSERVATION";

/** The menu entry that matches the state of the project. */
export function modeChoiceOf(
	mode: ProjectMode,
	kind: SimulationKind,
): ModeChoice {
	if (mode === ProjectMode.DESIGN) return "DESIGN";
	if (kind === "hardware-io") return "SIMULATION_HARDWARE_IO";
	if (kind === "observation") return "OBSERVATION";
	return "SIMULATION";
}

/**
 * Switches between the modes of the menu. The modes that use the board (real I/O, observation)
 * open the link themselves if needed, and the link they opened is closed once a mode that does
 * not need the board is in place.
 */
export default class ModeManager {
	private selecting = false;

	constructor(private readonly getStoreState: ProjectStoreGetFunction) {}

	async select(choice: ModeChoice): Promise<void> {
		const state = this.getStoreState();
		if (
			this.selecting ||
			choice === modeChoiceOf(state.mode, state.simulationKind)
		) {
			return;
		}
		this.selecting = true;
		try {
			await this.switchTo(choice);
		} finally {
			this.selecting = false;
		}
	}

	private async switchTo(choice: ModeChoice): Promise<void> {
		const { simulationManager, hardwareLinkManager } = this.getStoreState();
		switch (choice) {
			case "DESIGN":
				simulationManager.setDesignMode();
				return;
			case "SIMULATION":
				simulationManager.setSimulationMode("virtual");
				return;
			case "SIMULATION_HARDWARE_IO": {
				if (!(await hardwareLinkManager.enterHardwareIo())) {
					await hardwareLinkManager.onModeSettled();
					return;
				}
				if (!simulationManager.setSimulationMode("hardware-io")) {
					await hardwareLinkManager.leaveHardwareIo();
					await hardwareLinkManager.onModeSettled();
				}
				return;
			}
			case "OBSERVATION":
				await hardwareLinkManager.goOnline();
				await hardwareLinkManager.onModeSettled();
				return;
		}
	}
}
