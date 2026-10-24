import { crc16CcittFalse, crc32 } from "./crc";

describe("CRC", () => {
	it("computes the standard check values", () => {
		const check = new TextEncoder().encode("123456789");
		expect(crc16CcittFalse(check)).toBe(0x29b1);
		expect(crc32(check)).toBe(0xcbf43926);
	});
});
