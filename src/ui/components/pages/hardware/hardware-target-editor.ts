import type { HardwarePin } from "@/hardware/hardware-device.descriptor";
import type { HardwareTarget } from "@/schemas/hardware/hardware-target.schema";
import type Variable from "@/schemas/variable/variable.schema";
import type { ComponentType } from "react";

/** White field background, the page being laid on a light grey. */
export const whiteFieldSx = {
	"& .MuiInputBase-root": { backgroundColor: "#fff" },
};

/** Silkscreen name of a pin: `%PD2` is printed `D2` on the board. */
export const pinLabel = (address: string) => address.replace(/^%P/, "");

export interface HardwarePinCellsProps<T extends HardwareTarget> {
	target: T;
	pin: HardwarePin;
	/** Variables whose address is this pin. */
	boundVariables: Variable[];
	designing: boolean;
	onChange: (target: T) => void;
}

/**
 * Model-specific part of the hardware page: explanatory text and the extra pin-table columns.
 * `Headers` and `PinCells` render the same number of `TableCell`s.
 */
export interface HardwareTargetEditor<T extends HardwareTarget> {
	Intro: ComponentType;
	Headers: ComponentType;
	PinCells: ComponentType<HardwarePinCellsProps<T>>;
}
