/** CRC-8 (polynomial 0x07, initial value 0) over the ASCII bytes of `text`. */
export default function crc8(text: string): number {
	let crc = 0;
	for (let i = 0; i < text.length; i++) {
		crc ^= text.charCodeAt(i) & 0xff;
		for (let bit = 0; bit < 8; bit++) {
			crc = crc & 0x80 ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff;
		}
	}
	return crc;
}

/** Two uppercase hexadecimal characters. */
export function crc8Hex(text: string): string {
	return crc8(text).toString(16).toUpperCase().padStart(2, "0");
}
