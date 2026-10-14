import {
	compiledProject,
	plcVariable,
	UNO_PIN_RANGE,
} from "@tests/utils/bytecode-program";
import { HEADER_OFFSETS } from "./bytecode-format";
import {
	imageChecksum,
	imageIdentifier,
	writeU16,
	writeU32,
} from "./bytecode-image";
import generateBytecode from "./bytecode.generator";

const generated = () =>
	generateBytecode({
		compiled: compiledProject({
			variables: [plcVariable("i:INT")],
			routines: [["i := i + 1"]],
		}),
		ioBindings: [],
		cyclePeriodMs: 100,
		pinRange: UNO_PIN_RANGE,
	}).bytes;

describe("writeU16 / writeU32", () => {
	it("write little-endian at the given offset", () => {
		const target = new Uint8Array(8);
		writeU16(target, 1, 0x1234);
		writeU32(target, 3, 0xa1b2c3d4);
		expect([...target]).toEqual([0, 0x34, 0x12, 0xd4, 0xc3, 0xb2, 0xa1, 0]);
	});

	it("truncate to the field width", () => {
		const target = new Uint8Array(2);
		writeU16(target, 0, 0x12345);
		expect([...target]).toEqual([0x45, 0x23]);
	});

	it("round-trip with a header field", () => {
		const image = generated();
		writeU16(image, HEADER_OFFSETS.cyclePeriodMs, 777);
		expect(
			image[HEADER_OFFSETS.cyclePeriodMs] |
				(image[HEADER_OFFSETS.cyclePeriodMs + 1] << 8),
		).toBe(777);
	});
});

describe("imageChecksum", () => {
	it("equals the CRC stored by the generator", () => {
		const image = generated();
		expect(imageChecksum(image)).toBe(
			image[HEADER_OFFSETS.crc16] | (image[HEADER_OFFSETS.crc16 + 1] << 8),
		);
	});

	it("is stable and ignores its own field", () => {
		const image = generated();
		const before = imageChecksum(image);
		image[HEADER_OFFSETS.crc16] ^= 0xff;
		expect(imageChecksum(image)).toBe(before);
		expect(imageChecksum(image)).toBe(before);
	});

	it("changes when another byte changes", () => {
		const image = generated();
		const before = imageChecksum(image);
		image[image.length - 1] ^= 1;
		expect(imageChecksum(image)).not.toBe(before);
	});
});

describe("imageIdentifier", () => {
	it("ignores the checksum and identifier fields", () => {
		const image = generated();
		const id = imageIdentifier(image);
		writeU16(image, HEADER_OFFSETS.crc16, 0xbeef);
		writeU32(image, HEADER_OFFSETS.imageId, 0xdeadbeef);
		expect(imageIdentifier(image)).toBe(id);
	});

	it("depends on the other bytes", () => {
		const image = generated();
		const id = imageIdentifier(image);
		image[image.length - 1] ^= 1;
		expect(imageIdentifier(image)).not.toBe(id);
	});

	it("does not modify its input", () => {
		const image = generated();
		const copy = new Uint8Array(image);
		imageIdentifier(image);
		expect(image).toEqual(copy);
	});
});
