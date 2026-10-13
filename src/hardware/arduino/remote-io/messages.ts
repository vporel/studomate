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

/** Bytes of program carried by one `PROG_CHUNK` (96 hexadecimal characters: the frame stays under 128). */
export const PROGRAM_CHUNK_BYTES = 48;

const toHex = (bytes: ArrayLike<number>) =>
	Array.from({ length: bytes.length }, (_, i) =>
		bytes[i].toString(16).toUpperCase().padStart(2, "0"),
	).join("");

export type DeviceMessage =
	| {
			type: "PONG";
			protocolMajor: number;
			protocol: string;
			firmware: string;
			inputPeriodMs: number;
	  }
	| { type: "CFG_OK" }
	| { type: "PROG_READY" }
	| { type: "PROG_ACK"; seq: number }
	| { type: "PROG_OK"; imageId: number }
	| { type: "PROG_STOPPED" }
	| {
			type: "STATUS";
			/** 0 remote I/O, 1 program running, 2 fault, 3 program stopped. */
			state: number;
			/** 1 division by zero, 2 call depth, 3 watchdog, 4 invalid image. */
			fault: number;
			/** Identifier of the program image stored in the board, 0 when there is none. */
			imageId: number;
	  }
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

/** Starts the transfer of a program image of `size` bytes whose identifier is `imageId`. */
export const encodeProgramBegin = (size: number, imageId: number) =>
	encodeFrame("PROG_BEGIN", [
		String(size),
		(imageId >>> 0).toString(16).toUpperCase().padStart(8, "0"),
	]);

/** `seq` counts chunks from 0; the board acknowledges each one before the next is sent. */
export const encodeProgramChunk = (seq: number, bytes: Uint8Array) =>
	encodeFrame("PROG_CHUNK", [String(seq), toHex(bytes)]);

export const encodeStatusRequest = () => encodeFrame("STATUS");

/** Starts the program stored in the board; answered by `PROG_OK <imageId>`. */
export const encodeProgramRun = () => encodeFrame("PROG_RUN");

/** Halts the program and releases the pins; answered by `PROG_STOPPED`. */
export const encodeProgramStop = () => encodeFrame("PROG_STOP");

export const encodeProgramEnd = () => encodeFrame("PROG_END");

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
		case "STATUS": {
			const [state, fault, imageId] = frame.args;
			if (
				frame.args.length !== 3 ||
				!INTEGER_REGEX.test(state) ||
				!INTEGER_REGEX.test(fault) ||
				!/^[0-9A-Fa-f]{8}$/.test(imageId)
			) {
				return null;
			}
			return {
				type: "STATUS",
				state: Number(state),
				fault: Number(fault),
				imageId: Number.parseInt(imageId, 16),
			};
		}
		case "PROG_READY":
			return frame.args.length === 0 ? { type: "PROG_READY" } : null;
		case "PROG_STOPPED":
			return frame.args.length === 0 ? { type: "PROG_STOPPED" } : null;
		case "PROG_ACK":
			return frame.args.length === 1 && INTEGER_REGEX.test(frame.args[0])
				? { type: "PROG_ACK", seq: Number(frame.args[0]) }
				: null;
		case "PROG_OK":
			return frame.args.length === 1 && /^[0-9A-Fa-f]{8}$/.test(frame.args[0])
				? { type: "PROG_OK", imageId: Number.parseInt(frame.args[0], 16) }
				: null;
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
