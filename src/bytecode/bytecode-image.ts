import { HEADER_OFFSETS } from "./bytecode-format";
import { crc16CcittFalse, crc32 } from "./crc";

export function writeU16(
	target: Uint8Array,
	offset: number,
	value: number,
): void {
	target[offset] = value & 0xff;
	target[offset + 1] = (value >>> 8) & 0xff;
}

export function writeU32(
	target: Uint8Array,
	offset: number,
	value: number,
): void {
	writeU16(target, offset, value & 0xffff);
	writeU16(target, offset + 2, value >>> 16);
}

/** CRC-16 of the whole image, its own field (bytes 20 and 21) excluded. */
export function imageChecksum(image: Uint8Array): number {
	const covered = new Uint8Array(image.length - 2);
	covered.set(image.subarray(0, HEADER_OFFSETS.crc16));
	covered.set(image.subarray(HEADER_OFFSETS.crc16 + 2), HEADER_OFFSETS.crc16);
	return crc16CcittFalse(covered);
}

/** Identity of an image: CRC-32 with its checksum and identifier fields zeroed. */
export function imageIdentifier(image: Uint8Array): number {
	const copy = new Uint8Array(image);
	writeU16(copy, HEADER_OFFSETS.crc16, 0);
	writeU32(copy, HEADER_OFFSETS.imageId, 0);
	return crc32(copy);
}
