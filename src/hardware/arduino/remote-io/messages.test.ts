import { encodeFrame, parseFrameLine } from "./frame";
import {
	decodeDeviceMessage,
	encodeConfig,
	encodeOutputs,
	encodePing,
} from "./messages";

const decode = (command: string, args: string[] = []) => {
	const frame = parseFrameLine(encodeFrame(command, args).trim())!;
	return decodeDeviceMessage(frame);
};

describe("encoders", () => {
	it("encodes PING, CFG and OUT", () => {
		expect(encodePing()).toMatch(/^PING\*[0-9A-F]{2}\n$/);
		expect(
			encodeConfig([
				{ pin: "2", mode: "IP" },
				{ pin: "A0", mode: "A" },
			]),
		).toMatch(/^CFG 2:IP A0:A\*[0-9A-F]{2}\n$/);
		expect(
			encodeOutputs([
				{ pin: "13", value: 1 },
				{ pin: "9", value: 128 },
			]),
		).toBe("OUT 13=1 9=128*04\n");
	});

	it("encodes an empty OUT image", () => {
		expect(encodeOutputs([])).toMatch(/^OUT\*[0-9A-F]{2}\n$/);
	});
});

describe("decodeDeviceMessage", () => {
	it("decodes PONG", () => {
		expect(
			decode("PONG", ["STUDOMATE_REMOTE_IO", "1.2", "1.0.3", "20"]),
		).toEqual({
			type: "PONG",
			protocolMajor: 1,
			protocol: "1.2",
			firmware: "1.0.3",
			inputPeriodMs: 20,
		});
	});

	it("rejects a PONG of another program or with missing fields", () => {
		expect(decode("PONG", ["OTHER", "1.0", "1.0.0", "20"])).toBeNull();
		expect(decode("PONG", ["STUDOMATE_REMOTE_IO", "1.0"])).toBeNull();
		expect(decode("PONG", ["STUDOMATE_REMOTE_IO", "x", "1", "20"])).toBeNull();
	});

	it("decodes CFG_OK and ERR", () => {
		expect(decode("CFG_OK")).toEqual({ type: "CFG_OK" });
		expect(decode("ERR", ["PIN"])).toEqual({ type: "ERR", code: "PIN" });
		expect(decode("ERR")).toBeNull();
	});

	it("decodes IN", () => {
		expect(decode("IN", ["2=1", "A0=1023"])).toEqual({
			type: "IN",
			values: [
				{ pin: "2", value: 1 },
				{ pin: "A0", value: 1023 },
			],
		});
	});

	it("rejects an IN with a malformed pair", () => {
		expect(decode("IN", ["2"])).toBeNull();
		expect(decode("IN", ["Z9=1"])).toBeNull();
		expect(decode("IN", ["2=x"])).toBeNull();
		expect(decode("IN", ["2=1=1"])).toBeNull();
	});

	it("ignores unknown commands", () => {
		expect(decode("FOO")).toBeNull();
	});
});
