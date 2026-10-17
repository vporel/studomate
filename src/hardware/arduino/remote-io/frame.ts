import { crc8Hex } from "./crc8";

/** Maximum length of a frame, `\n` excluded. */
export const MAX_FRAME_LENGTH = 128;

export interface Frame {
	command: string;
	args: string[];
}

const COMMAND_REGEX = /^[A-Z_]+$/;

/** `COMMAND arg arg*CC\n`, where `CC` is the CRC-8 of everything before `*`. */
export function encodeFrame(command: string, args: string[] = []): string {
	const body = [command, ...args].join(" ");
	const line = `${body}*${crc8Hex(body)}`;
	if (line.length > MAX_FRAME_LENGTH) {
		throw new RangeError(`Frame longer than ${MAX_FRAME_LENGTH} bytes`);
	}
	return `${line}\n`;
}

/** Parses one line (no `\n`); `null` when it is not a valid frame. */
export function parseFrameLine(line: string): Frame | null {
	if (line.length > MAX_FRAME_LENGTH) return null;
	const star = line.lastIndexOf("*");
	if (star === -1 || line.length - star !== 3) return null;
	const body = line.slice(0, star);
	if (crc8Hex(body) !== line.slice(star + 1).toUpperCase()) return null;
	const [command, ...args] = body.split(" ");
	if (!COMMAND_REGEX.test(command)) return null;
	return { command, args };
}

/**
 * Splits a byte stream into frames. Lines with a wrong CRC, an unknown shape or an excessive
 * length are dropped, which also discards the stray bytes a board emits while rebooting.
 */
export class FrameDecoder {
	private buffer = "";
	private overflowed = false;

	push(chunk: string): Frame[] {
		const frames: Frame[] = [];
		for (const char of chunk) {
			if (char !== "\n") {
				if (this.overflowed) continue;
				this.buffer += char;
				if (this.buffer.length > MAX_FRAME_LENGTH) {
					this.overflowed = true;
					this.buffer = "";
				}
				continue;
			}
			const line = this.buffer.replace(/\r$/, "");
			const wasOverflowed = this.overflowed;
			this.buffer = "";
			this.overflowed = false;
			if (wasOverflowed) continue;
			const frame = parseFrameLine(line);
			if (frame) frames.push(frame);
		}
		return frames;
	}
}
