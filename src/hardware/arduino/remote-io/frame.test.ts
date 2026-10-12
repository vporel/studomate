import {
	encodeFrame,
	FrameDecoder,
	MAX_FRAME_LENGTH,
	parseFrameLine,
} from "./frame";

describe("encodeFrame / parseFrameLine", () => {
	it("round-trips a command with arguments", () => {
		const line = encodeFrame("OUT", ["13=1", "9=128"]);
		expect(line).toBe("OUT 13=1 9=128*04\n");
		expect(parseFrameLine(line.trim())).toEqual({
			command: "OUT",
			args: ["13=1", "9=128"],
		});
	});

	it("encodes a command without arguments", () => {
		expect(parseFrameLine(encodeFrame("PING").trim())).toEqual({
			command: "PING",
			args: [],
		});
	});

	it("accepts a lowercase CRC", () => {
		const line = encodeFrame("OUT", ["13=1", "9=128"]).trim().toLowerCase();
		expect(parseFrameLine(line.replace("out", "OUT"))).not.toBeNull();
	});

	it("rejects a wrong CRC, a missing CRC and a malformed command", () => {
		expect(parseFrameLine("OUT 13=1*00")).toBeNull();
		expect(parseFrameLine("OUT 13=1")).toBeNull();
		expect(parseFrameLine("OUT 13=1*5")).toBeNull();
		expect(parseFrameLine("out 13=1*00")).toBeNull();
	});

	it("refuses to encode a frame over the maximum length", () => {
		expect(() => encodeFrame("OUT", ["1=1".repeat(MAX_FRAME_LENGTH)])).toThrow(
			RangeError,
		);
	});
});

describe("FrameDecoder", () => {
	it("reassembles a frame split across chunks", () => {
		const decoder = new FrameDecoder();
		const line = encodeFrame("IN", ["2=1", "A0=512"]);
		expect(decoder.push(line.slice(0, 5))).toEqual([]);
		expect(decoder.push(line.slice(5))).toEqual([
			{ command: "IN", args: ["2=1", "A0=512"] },
		]);
	});

	it("returns several frames of one chunk and tolerates CRLF", () => {
		const decoder = new FrameDecoder();
		const chunk =
			encodeFrame("CFG_OK").replace("\n", "\r\n") + encodeFrame("IN", ["2=0"]);
		expect(decoder.push(chunk).map((frame) => frame.command)).toEqual([
			"CFG_OK",
			"IN",
		]);
	});

	it("drops stray bytes up to the next end of line", () => {
		const decoder = new FrameDecoder();
		const frames = decoder.push(
			"\u0000ÿgarbage" + encodeFrame("CFG_OK") + "tail",
		);
		expect(frames).toEqual([]);
		expect(decoder.push(encodeFrame("CFG_OK"))).toEqual([]);
	});

	it("recovers right after a garbage line", () => {
		const decoder = new FrameDecoder();
		expect(decoder.push("xx\n" + encodeFrame("CFG_OK"))).toEqual([
			{ command: "CFG_OK", args: [] },
		]);
	});

	it("drops an overlong line and resumes at the next one", () => {
		const decoder = new FrameDecoder();
		const frames = decoder.push(
			"A".repeat(MAX_FRAME_LENGTH + 20) + "\n" + encodeFrame("CFG_OK"),
		);
		expect(frames).toEqual([{ command: "CFG_OK", args: [] }]);
	});

	it("ignores a bare text line such as a debug message", () => {
		expect(new FrameDecoder().push("WD\n")).toEqual([]);
	});
});
