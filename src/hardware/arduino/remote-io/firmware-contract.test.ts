import { readFileSync } from "fs";
import { join } from "path";
import { MAX_FRAME_LENGTH } from "./frame";
import { PROTOCOL_MAJOR_VERSION } from "./messages";

const root = join(__dirname, "../../../..");
const sketch = readFileSync(
	join(root, "firmwares/arduino/uno-r3/uno-r3.ino"),
	"utf8",
);
const clientSource = readFileSync(
	join(__dirname, "remote-io.client.ts"),
	"utf8",
);

const sketchDefine = (name: string) =>
	new RegExp(`^#define\\s+${name}\\s+(\\S+)`, "m").exec(sketch)?.[1];

describe("Uno R3 sketch and remote I/O client contract", () => {
	const number = (name: string) => Number(sketchDefine(name));

	it("speaks the protocol major version the client expects", () => {
		const version = sketchDefine("PROTOCOL_VERSION")?.replace(/"/g, "");
		expect(version).toBeDefined();
		expect(Number(version!.split(".")[0])).toBe(PROTOCOL_MAJOR_VERSION);
	});

	it("accepts frames as long as the client sends them", () => {
		expect(number("MAX_FRAME_LENGTH")).toBe(MAX_FRAME_LENGTH);
	});

	it("keeps the client heartbeat well inside the watchdog", () => {
		const heartbeat = Number(
			/heartbeatIntervalMs:\s*(\d+)/.exec(clientSource)?.[1],
		);
		expect(heartbeat).toBeGreaterThan(0);
		expect(heartbeat).toBeLessThan(number("WATCHDOG_TIMEOUT") / 3);
	});

	it("sends its inputs more often than the watchdog trips", () => {
		expect(number("INPUT_PERIOD_MS")).toBeGreaterThan(0);
		expect(number("INPUT_PERIOD_MS")).toBeLessThan(number("WATCHDOG_TIMEOUT"));
	});

	it("fits a telemetry chunk in the frame body buffer and in a frame", () => {
		const chunk = Number(/TELEMETRY_CHUNK_BYTES\s*=\s*(\d+)/.exec(sketch)?.[1]);
		const bodyBuffer = Number(
			/char body\[(\d+)\];\s*\n\s*int length = snprintf\(body, sizeof\(body\), "TEL/.exec(
				sketch,
			)?.[1],
		);
		// "TEL " + tag (4) + cycle count (up to 10) + offset (up to 5) + 3 separators
		const telemetryHeader = 4 + 4 + 10 + 5 + 3;
		expect(chunk).toBeGreaterThan(0);
		expect(bodyBuffer).toBeGreaterThan(0);
		expect(telemetryHeader + 2 * chunk).toBeLessThan(bodyBuffer);
		expect(telemetryHeader + 2 * chunk).toBeLessThanOrEqual(MAX_FRAME_LENGTH);
	});
});
