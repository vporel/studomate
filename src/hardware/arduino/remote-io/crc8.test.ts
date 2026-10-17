import crc8, { crc8Hex } from "./crc8";

describe("crc8", () => {
	it("is 0 for an empty text", () => {
		expect(crc8("")).toBe(0);
	});

	it("matches the CRC-8 (poly 0x07) check value of '123456789'", () => {
		expect(crc8("123456789")).toBe(0xf4);
	});

	it("formats on two uppercase hex characters", () => {
		expect(crc8Hex("OUT 13=1 9=128")).toBe("04");
		expect(crc8Hex("")).toBe("00");
	});
});
