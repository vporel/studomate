import { FLASH_PAGE_SIZE, IntelHexError, parseIntelHex } from "./intel-hex";

const record = (address: number, type: number, data: number[]) => {
	const body = [data.length, address >> 8, address & 0xff, type, ...data];
	const sum = body.reduce((a, b) => a + b, 0);
	const checksum = (256 - (sum % 256)) % 256;
	return (
		":" +
		[...body, checksum]
			.map((b) => b.toString(16).toUpperCase().padStart(2, "0"))
			.join("")
	);
};
const EOF_RECORD = ":00000001FF";

describe("parseIntelHex", () => {
	it("pads the image to a whole page with 0xFF", () => {
		const image = parseIntelHex(
			[record(0, 0, [1, 2, 3]), EOF_RECORD].join("\n"),
		);
		expect(image.length).toBe(FLASH_PAGE_SIZE);
		expect(Array.from(image.slice(0, 4))).toEqual([1, 2, 3, 0xff]);
	});

	it("places records at their address and leaves gaps at 0xFF", () => {
		const image = parseIntelHex(
			[record(0, 0, [0xaa]), record(200, 0, [0xbb]), EOF_RECORD].join("\r\n"),
		);
		expect(image.length).toBe(2 * FLASH_PAGE_SIZE);
		expect(image[0]).toBe(0xaa);
		expect(image[100]).toBe(0xff);
		expect(image[200]).toBe(0xbb);
	});

	it("applies an extended segment address record", () => {
		const image = parseIntelHex(
			[record(0, 2, [0x00, 0x10]), record(0, 0, [7]), EOF_RECORD].join("\n"),
			16,
		);
		expect(image[0x100]).toBe(7);
		expect(image.length).toBe(0x110);
	});

	it("is empty for a file with only the end-of-file record", () => {
		expect(parseIntelHex(EOF_RECORD).length).toBe(0);
	});

	it("rejects a bad checksum, a malformed line, a missing EOF and trailing data", () => {
		const good = record(0, 0, [1]);
		expect(() =>
			parseIntelHex(good.slice(0, -2) + "00\n" + EOF_RECORD),
		).toThrow(IntelHexError);
		expect(() => parseIntelHex("garbage\n" + EOF_RECORD)).toThrow(
			IntelHexError,
		);
		expect(() => parseIntelHex(good)).toThrow("Missing end-of-file");
		expect(() => parseIntelHex(EOF_RECORD + "\n" + good)).toThrow(
			"after the end-of-file",
		);
	});

	it("rejects a record whose length field does not match", () => {
		expect(() => parseIntelHex(":0400000001FB\n" + EOF_RECORD)).toThrow(
			IntelHexError,
		);
	});

	it("rejects unsupported record types", () => {
		expect(() =>
			parseIntelHex(record(0, 4, [0, 1]) + "\n" + EOF_RECORD),
		).toThrow("Unsupported");
	});
});
