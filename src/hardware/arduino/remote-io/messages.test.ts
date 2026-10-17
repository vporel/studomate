import { encodeFrame, parseFrameLine } from "./frame";
import {
	decodeDeviceMessage,
	encodeConfig,
	encodeOutputs,
	encodePing,
	encodeProgramBegin,
	encodeProgramChunk,
	encodeProgramEnd,
	encodeProgramRun,
	encodeProgramStop,
	encodeStatusRequest,
	encodeForce,
	encodeSetVariable,
	encodeUnforce,
	encodeWatch,
	PROGRAM_CHUNK_BYTES,
} from "./messages";
import { MAX_FRAME_LENGTH } from "./frame";

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

describe("program transfer frames", () => {
	it("encodes PROG_BEGIN with the size and the identifier in 8 hexadecimal digits", () => {
		expect(encodeProgramBegin(647, 0xab12cd)).toMatch(
			/^PROG_BEGIN 647 00AB12CD\*[0-9A-F]{2}\n$/,
		);
	});

	it("encodes PROG_CHUNK as uppercase hexadecimal, within the frame limit", () => {
		const bytes = Uint8Array.from(
			{ length: PROGRAM_CHUNK_BYTES },
			(_, i) => 0xf0 + (i % 16),
		);
		const line = encodeProgramChunk(99999, bytes);
		expect(line).toMatch(
			/^PROG_CHUNK 99999 (?:[0-9A-F]{2}){48}\*[0-9A-F]{2}\n$/,
		);
		expect(line.length - 1).toBeLessThanOrEqual(MAX_FRAME_LENGTH);
	});

	it("encodes PROG_END", () => {
		expect(encodeProgramEnd()).toMatch(/^PROG_END\*[0-9A-F]{2}\n$/);
	});

	it("decodes the board answers", () => {
		expect(decode("PROG_READY")).toEqual({ type: "PROG_READY" });
		expect(decode("PROG_ACK", ["12"])).toEqual({ type: "PROG_ACK", seq: 12 });
		expect(decode("PROG_OK", ["00AB12CD"])).toEqual({
			type: "PROG_OK",
			imageId: 0xab12cd,
		});
		expect(decode("PROG_OK", ["FFFFFFFF"])).toEqual({
			type: "PROG_OK",
			imageId: 0xffffffff,
		});
	});

	it.each([
		["PROG_READY", ["x"]],
		["PROG_ACK", []],
		["PROG_ACK", ["a"]],
		["PROG_OK", ["123"]],
		["PROG_OK", ["0000000G"]],
	])("rejects a malformed %s %j", (command, args) => {
		expect(decode(command, args)).toBeNull();
	});
});

describe("STATUS", () => {
	it("encodes the request", () => {
		expect(encodeStatusRequest()).toMatch(/^STATUS\*[0-9A-F]{2}\n$/);
	});

	it("decodes the board answer", () => {
		expect(decode("STATUS", ["1", "0", "00AB12CD"])).toEqual({
			type: "STATUS",
			state: 1,
			fault: 0,
			imageId: 0xab12cd,
		});
	});

	it.each([[["1", "0"]], [["x", "0", "00000000"]], [["1", "0", "1234"]]])(
		"rejects a malformed answer %j",
		(args) => {
			expect(decode("STATUS", args)).toBeNull();
		},
	);
});

describe("program start and stop frames", () => {
	it("encodes PROG_RUN and PROG_STOP", () => {
		expect(encodeProgramRun()).toMatch(/^PROG_RUN\*[0-9A-F]{2}\n$/);
		expect(encodeProgramStop()).toMatch(/^PROG_STOP\*[0-9A-F]{2}\n$/);
	});

	it("decodes PROG_STOPPED and rejects one with arguments", () => {
		expect(decode("PROG_STOPPED")).toEqual({ type: "PROG_STOPPED" });
		expect(decode("PROG_STOPPED", ["x"])).toBeNull();
	});
});

describe("telemetry frames", () => {
	it("encodes WATCH 1 and WATCH 0", () => {
		expect(encodeWatch(true)).toMatch(/^WATCH 1\*[0-9A-F]{2}\n$/);
		expect(encodeWatch(false)).toMatch(/^WATCH 0\*[0-9A-F]{2}\n$/);
	});

	it("decodes WATCH_OK", () => {
		expect(decode("WATCH_OK")).toEqual({ type: "WATCH_OK" });
		expect(decode("WATCH_OK", ["x"])).toBeNull();
	});

	it("decodes a TEL frame into its bytes", () => {
		expect(decode("TEL", ["ABCD", "12", "16", "00FF7A"])).toEqual({
			type: "TEL",
			tag: 0xabcd,
			cycle: 12,
			offset: 16,
			data: Uint8Array.from([0x00, 0xff, 0x7a]),
		});
	});

	it("keeps a frame of 16 bytes under the transmit buffer of the board", () => {
		const frame = encodeFrame("TEL", ["ABCD", "65535", "496", "00".repeat(16)]);
		expect(frame.length).toBeLessThan(64);
	});

	it.each([
		[["ABC", "1", "0", "00"]],
		[["ABCD", "x", "0", "00"]],
		[["ABCD", "1", "-1", "00"]],
		[["ABCD", "1", "0", "0"]],
		[["ABCD", "1", "0", "ZZ"]],
		[["ABCD", "1", "0"]],
	])("rejects a malformed TEL frame %j", (args) => {
		expect(decode("TEL", args)).toBeNull();
	});
});

describe("variable write frames", () => {
	it("encodes SET, FORCE and UNFORCE", () => {
		expect(encodeSetVariable(3, 42)).toMatch(/^SET 3 42\*[0-9A-F]{2}\n$/);
		expect(encodeForce(5, -7)).toMatch(/^FORCE 5 -7\*[0-9A-F]{2}\n$/);
		expect(encodeUnforce(5)).toMatch(/^UNFORCE 5\*[0-9A-F]{2}\n$/);
		expect(encodeUnforce("all")).toMatch(/^UNFORCE ALL\*[0-9A-F]{2}\n$/);
	});

	it("sends a value as a signed 32-bit decimal, as the variable holds it", () => {
		expect(encodeForce(1, 4000000000)).toMatch(/^FORCE 1 -294967296\*/);
		expect(encodeSetVariable(1, 2147483648)).toMatch(/^SET 1 -2147483648\*/);
		expect(encodeSetVariable(1, 65535)).toMatch(/^SET 1 65535\*/);
	});

	it("decodes the acknowledgements, and rejects arguments", () => {
		expect(decode("FORCE_OK")).toEqual({ type: "FORCE_OK" });
		expect(decode("SET_OK")).toEqual({ type: "SET_OK" });
		expect(decode("FORCE_OK", ["x"])).toBeNull();
		expect(decode("SET_OK", ["x"])).toBeNull();
	});
});
