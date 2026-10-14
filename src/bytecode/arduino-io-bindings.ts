import type { RemoteIoPlan } from "@/hardware/arduino/remote-io/remote-io-plan";
import { IO_ROLE, type IoRole } from "./bytecode-format";
import type { IoBinding } from "./bytecode.generator";

/** Pin number of the I/O table, as in the serial protocol: D2..D13 are 2..13, A0..A5 are 14..19. */
export function pinNumber(pin: string): number {
	return pin.startsWith("A") ? 14 + Number(pin.slice(1)) : Number(pin);
}

/** Bindings of the pins a remote I/O plan wires to the variables of an Arduino project. */
export default function arduinoIoBindings(plan: RemoteIoPlan): IoBinding[] {
	const modeByPin = new Map(plan.pins.map((entry) => [entry.pin, entry.mode]));
	const inputRole = (pin: string, kind: "digital" | "analog"): IoRole =>
		kind === "analog"
			? IO_ROLE.ANALOG_INPUT
			: modeByPin.get(pin) === "IP"
				? IO_ROLE.DIGITAL_INPUT_PULLUP
				: IO_ROLE.DIGITAL_INPUT;
	return [
		...plan.inputs.map((input) => ({
			variableId: input.variableId,
			role: inputRole(input.pin, input.kind),
			pin: pinNumber(input.pin),
			inverted: input.kind === "digital" && input.inverted,
		})),
		...plan.outputs.map((output) => ({
			variableId: output.variableId,
			role:
				output.kind === "analog" ? IO_ROLE.PWM_OUTPUT : IO_ROLE.DIGITAL_OUTPUT,
			pin: pinNumber(output.pin),
		})),
	];
}
