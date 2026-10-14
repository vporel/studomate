import { ProjectMode } from "./ProjectMode.enum";
import type { ProjectStoreState } from "./project.store.types";

type HardwareActionsState = Pick<
	ProjectStoreState,
	"project" | "mode" | "simulationKind" | "hardwareLink" | "hardwareUpload"
>;

export type HardwareActions = {
	/** A simulation mode uses the board: its program and pins are not left to the user meanwhile. */
	boardInUse: boolean;
	canUpload: boolean;
	canLink: boolean;
	canUnlink: boolean;
	canStart: boolean;
	canStop: boolean;
};

/**
 * Which actions on the board of the project are enabled. `supported` is the browser capability
 * to talk to a board, known only on the client after mounting.
 */
export function selectHardwareActions(
	state: HardwareActionsState,
	supported: boolean,
): HardwareActions {
	const { status, boardMode, programPresent } = state.hardwareLink;
	const available = !!state.project?.hardwareTarget && supported;
	const linked = available && status === "linked";
	const uploading = state.hardwareUpload.phase === "uploading";
	const boardInUse =
		state.mode === ProjectMode.SIMULATION && state.simulationKind !== "virtual";
	const idle = linked && !uploading && !boardInUse;
	return {
		boardInUse,
		canUpload:
			available &&
			state.mode === ProjectMode.DESIGN &&
			!uploading &&
			status !== "connecting",
		canLink: available && status === "disconnected" && !uploading,
		canUnlink: idle,
		canStart: idle && programPresent && boardMode !== "program-running",
		canStop: idle && boardMode === "program-running",
	};
}
