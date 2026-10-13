/** CRC-16/CCITT-FALSE: polynomial 0x1021, initial value 0xFFFF, no reflection. */
export function crc16CcittFalse(bytes: ArrayLike<number>): number {
	let crc = 0xffff;
	for (let i = 0; i < bytes.length; i++) {
		crc ^= bytes[i] << 8;
		for (let bit = 0; bit < 8; bit++) {
			crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
		}
	}
	return crc;
}

let crc32Table: Uint32Array | null = null;

/** CRC-32/ISO-HDLC (the zlib one). */
export function crc32(bytes: ArrayLike<number>): number {
	if (!crc32Table) {
		crc32Table = new Uint32Array(256);
		for (let n = 0; n < 256; n++) {
			let c = n;
			for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
			crc32Table[n] = c >>> 0;
		}
	}
	let crc = 0xffffffff;
	for (let i = 0; i < bytes.length; i++) {
		crc = crc32Table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}
