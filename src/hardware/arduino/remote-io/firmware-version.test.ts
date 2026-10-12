import { parseIntelHex } from "@/hardware/arduino/flash/intel-hex";
import { readFileSync } from "fs";
import { join } from "path";
import {
	compareVersions,
	isFirmwareOutdated,
	SHIPPED_FIRMWARE_VERSION,
} from "./firmware-version";

describe("compareVersions", () => {
	it("compares field by field, numerically", () => {
		expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
		expect(compareVersions("1.0.1", "1.0.0")).toBe(1);
		expect(compareVersions("1.9.0", "1.10.0")).toBe(-1);
		expect(compareVersions("2.0", "1.9.9")).toBe(1);
	});

	it("treats missing fields as 0", () => {
		expect(compareVersions("1.0", "1.0.0")).toBe(0);
		expect(compareVersions("1", "1.0.1")).toBe(-1);
	});
});

describe("isFirmwareOutdated", () => {
	it("is true for an older version, false for the same or a newer one", () => {
		expect(isFirmwareOutdated("0.9.0", "1.0.0")).toBe(true);
		expect(isFirmwareOutdated("1.0.0", "1.0.0")).toBe(false);
		expect(isFirmwareOutdated("1.1.0", "1.0.0")).toBe(false);
	});

	it("is true for something that is not a version", () => {
		expect(isFirmwareOutdated("abc", "1.0.0")).toBe(true);
		expect(isFirmwareOutdated("", "1.0.0")).toBe(true);
	});

	it("defaults to the shipped version", () => {
		expect(isFirmwareOutdated(SHIPPED_FIRMWARE_VERSION)).toBe(false);
	});
});

describe("shipped firmware", () => {
	const root = join(__dirname, "../../../..");

	it("the sketch declares the shipped version", () => {
		const sketch = readFileSync(
			join(root, "firmwares/arduino/uno-r3-remote-io/uno-r3-remote-io.ino"),
			"utf8",
		);
		expect(sketch).toContain(
			`#define FIRMWARE_VERSION "${SHIPPED_FIRMWARE_VERSION}"`,
		);
	});

	it("the precompiled .hex embeds the shipped version", () => {
		const hex = readFileSync(
			join(root, "public/firmwares/arduino/uno-r3-remote-io.hex"),
			"utf8",
		);
		const image = parseIntelHex(hex);
		const text = Buffer.from(image).toString("latin1");
		expect(text).toContain(SHIPPED_FIRMWARE_VERSION);
	});
});
