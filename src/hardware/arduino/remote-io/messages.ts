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

/**
 * Bytes of variable memory in one `TEL` frame: the board writes a frame only when its transmit
 * buffer can take it whole (64 bytes on the Uno), so it never blocks the program.
 */
export const TELEMETRY_CHUNK_BYTES = 16;

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
	| { type: "WATCH_OK" }
	| { type: "FORCE_OK" }
	| { type: "SET_OK" }
	| {
			type: "TEL";
			/** Low 16 bits of the identifier of the program that produced the frame. */
			tag: number;
			/** Cycle counter of the program when the frame was written, modulo 65536. */
			cycle: number;
			/** Position of the bytes in the variable memory. */
			offset: number;
			data: Uint8Array;
	  }
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

/** Signed 32-bit decimal of a value as a variable holds it (a `DWORD` above 2^31 wraps). */
const int32Decimal = (value: number) => String(value | 0);

/** Writes a variable of the running program once; answered by `SET_OK`. */
export const encodeSetVariable = (index: number, value: number) =>
	encodeFrame("SET", [String(index), int32Decimal(value)]);

/** Imposes a value on a variable until it is released; answered by `FORCE_OK`. */
export const encodeForce = (index: number, value: number) =>
	encodeFrame("FORCE", [String(index), int32Decimal(value)]);

/** Releases a forced variable, or all of them with `"all"`; answered by `FORCE_OK`. */
export const encodeUnforce = (index: number | "all") =>
	encodeFrame("UNFORCE", [index === "all" ? "ALL" : String(index)]);

/** Starts or stops the telemetry of the running program; answered by `WATCH_OK`. */
export const encodeWatch = (on: boolean) =>
	encodeFrame("WATCH", [on ? "1" : "0"]);

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
		case "FORCE_OK":
			return frame.args.length === 0 ? { type: "FORCE_OK" } : null;
		case "SET_OK":
			return frame.args.length === 0 ? { type: "SET_OK" } : null;
		case "WATCH_OK":
			return frame.args.length === 0 ? { type: "WATCH_OK" } : null;
		case "TEL": {
			const [tag, cycle, offset, hex] = frame.args;
			if (
				frame.args.length !== 4 ||
				!/^[0-9A-Fa-f]{4}$/.test(tag) ||
				!INTEGER_REGEX.test(cycle) ||
				!INTEGER_REGEX.test(offset) ||
				!/^(?:[0-9A-Fa-f]{2})+$/.test(hex)
			) {
				return null;
			}
			return {
				type: "TEL",
				tag: Number.parseInt(tag, 16),
				cycle: Number(cycle),
				offset: Number(offset),
				data: Uint8Array.from({ length: hex.length / 2 }, (_, i) =>
					Number.parseInt(hex.slice(2 * i, 2 * i + 2), 16),
				),
			};
		}
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
