import { encodeFrame, type Frame } from "./frame";

export const PROTOCOL_NAME = "STUDOMATE_REMOTE_IO";
/** Major version of the protocol this client speaks. */
export const PROTOCOL_MAJOR_VERSION = 1;

/** `I` input, `IP` input with pull-up, `O` output, `P` PWM output, `A` analog input. */
export type PinMode = "I" | "IP" | "O" | "P" | "A";

export interface PinConfigEntry {
	/** Arduino pin name without the `%P` prefix, e.g. `2` or `A0`. */
	pin: string;
	mode: PinMode;
}

export interface PinValue {
	pin: string;
	value: number;
}

export type DeviceMessage =
	| {
			type: "PONG";
			protocolMajor: number;
			protocol: string;
			firmware: string;
			inputPeriodMs: number;
	  }
	| { type: "CFG_OK" }
	| { type: "ERR"; code: string }
	| { type: "IN"; values: PinValue[] };

export const encodePing = () => encodeFrame("PING");

export const encodeConfig = (entries: PinConfigEntry[]) =>
	encodeFrame(
		"CFG",
		entries.map((entry) => `${entry.pin}:${entry.mode}`),
	);

export const encodeOutputs = (values: PinValue[]) =>
	encodeFrame(
		"OUT",
		values.map((entry) => `${entry.pin}=${entry.value}`),
	);

const PIN_REGEX = /^(?:A[0-5]|\d{1,2})$/;
const INTEGER_REGEX = /^\d{1,5}$/;

function parsePinValues(args: string[]): PinValue[] | null {
	const values: PinValue[] = [];
	for (const arg of args) {
		const [pin, value, ...rest] = arg.split("=");
		if (
			rest.length > 0 ||
			!PIN_REGEX.test(pin) ||
			!INTEGER_REGEX.test(value ?? "")
		) {
			return null;
		}
		values.push({ pin, value: Number(value) });
	}
	return values;
}

/** Interprets a valid frame sent by the board; `null` for an unknown or malformed message. */
export function decodeDeviceMessage(frame: Frame): DeviceMessage | null {
	switch (frame.command) {
		case "PONG": {
			const [name, protocol, firmware, period] = frame.args;
			const protocolMajor = Number.parseInt(protocol ?? "", 10);
			if (
				name !== PROTOCOL_NAME ||
				frame.args.length !== 4 ||
				Number.isNaN(protocolMajor) ||
				!INTEGER_REGEX.test(period)
			) {
				return null;
			}
			return {
				type: "PONG",
				protocolMajor,
				protocol,
				firmware,
				inputPeriodMs: Number(period),
			};
		}
		case "CFG_OK":
			return frame.args.length === 0 ? { type: "CFG_OK" } : null;
		case "ERR":
			return frame.args.length >= 1
				? { type: "ERR", code: frame.args[0] }
				: null;
		case "IN": {
			const values = parsePinValues(frame.args);
			return values ? { type: "IN", values } : null;
		}
		default:
			return null;
	}
}
