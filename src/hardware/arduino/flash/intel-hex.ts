/** Flash page size of the ATmega328P (Optiboot works in pages of 128 bytes). */
export const FLASH_PAGE_SIZE = 128;

export class IntelHexError extends Error {}

/**
 * Binary image of an Intel HEX file, from address 0, padded with `0xFF` to a whole number of
 * pages. Only data (00), end of file (01) and extended segment address (02) records are used,
 * which is what `avr-gcc` emits for a 32 KB device.
 */
export function parseIntelHex(
	text: string,
	pageSize = FLASH_PAGE_SIZE,
): Uint8Array {
	const bytes: number[] = [];
	let segmentBase = 0;
	let ended = false;

	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (line === "") continue;
		if (ended) throw new IntelHexError("Data after the end-of-file record");
		if (!/^:(?:[0-9A-Fa-f]{2})+$/.test(line)) {
			throw new IntelHexError(`Malformed line: ${line}`);
		}
		const record = Array.from({ length: (line.length - 1) / 2 }, (_, i) =>
			Number.parseInt(line.slice(1 + i * 2, 3 + i * 2), 16),
		);
		const [length, high, low, type] = record;
		if (record.length !== length + 5) {
			throw new IntelHexError(`Wrong record length: ${line}`);
		}
		if (record.reduce((sum, b) => sum + b, 0) % 256 !== 0) {
			throw new IntelHexError(`Checksum mismatch: ${line}`);
		}
		const data = record.slice(4, 4 + length);
		if (type === 0x00) {
			const base = segmentBase + ((high << 8) | low);
			data.forEach((value, i) => (bytes[base + i] = value));
		} else if (type === 0x01) {
			ended = true;
		} else if (type === 0x02) {
			segmentBase = ((data[0] << 8) | data[1]) << 4;
		} else {
			throw new IntelHexError(`Unsupported record type ${type}`);
		}
	}
	if (!ended) throw new IntelHexError("Missing end-of-file record");

	const image = new Uint8Array(
		Math.ceil(bytes.length / pageSize) * pageSize,
	).fill(0xff);
	bytes.forEach((value, i) => {
		if (value !== undefined) image[i] = value;
	});
	return image;
}
