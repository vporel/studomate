import type { FlashProgress } from "@/hardware/arduino/flash/stk500";
import type { RemoteIoPlan } from "@/hardware/arduino/remote-io/remote-io-plan";

export type HardwareLinkStatus = "disconnected" | "connecting" | "linked";

/**
 * What the linked board does with its pins: serves them to Studomate (`remote-io`), runs its own
 * program, or is halted with its pins released.
 */
export type BoardMode = "remote-io" | "program-running" | "program-stopped";

export interface HardwareLinkState {
	status: HardwareLinkStatus;
	/** Input variables whose value comes from a pin while the board is linked. */
	drivenInputIds: string[];
	boardMode: BoardMode;
	/** The board holds a program it can start. */
	programPresent: boolean;
}

/** Why the firmware of the board has to be installed. */
export type FirmwareInstallReason = "missing" | "outdated";

export interface HardwareFirmwareState {
	/** `confirming`: the user is asked before the program of the board is erased. */
	phase: "idle" | "confirming" | "flashing";
	reason: FirmwareInstallReason | null;
	progress: FlashProgress | null;
}

export const IDLE_HARDWARE_FIRMWARE: HardwareFirmwareState = {
	phase: "idle",
	reason: null,
	progress: null,
};

/** Progress of the transfer of the program to the board. */
export interface HardwareUploadState {
	phase: "idle" | "uploading";
	sentBytes: number;
	totalBytes: number;
}

export const IDLE_HARDWARE_UPLOAD: HardwareUploadState = {
	phase: "idle",
	sentBytes: 0,
	totalBytes: 0,
};

export const DISCONNECTED_HARDWARE_LINK: HardwareLinkState = {
	status: "disconnected",
	drivenInputIds: [],
	boardMode: "remote-io",
	programPresent: false,
};

/** Input variables a pin plan drives. */
export function drivenInputIdsOf(plan: RemoteIoPlan): string[] {
	return plan.inputs.map((input) => input.variableId);
}
