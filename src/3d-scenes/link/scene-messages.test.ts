import {
	SCENE_PROTOCOL_VERSION,
	parseSceneMessage,
	toEnvelope,
} from "./scene-messages";

describe("scene messages", () => {
	it("round-trips a message through its envelope and a structured clone", () => {
		const message = {
			type: "state" as const,
			sceneId: "carton-sorting",
			sceneVersion: 1,
			state: { cartonPos: 12, nested: { a: [1, 2] } },
			simTimeMs: 300,
			status: "running" as const,
		};
		const received = parseSceneMessage(structuredClone(toEnvelope(message)));
		expect(received).toEqual(message);
	});

	it("stamps the protocol version", () => {
		expect(toEnvelope({ type: "ping" }).protocolVersion).toBe(
			SCENE_PROTOCOL_VERSION,
		);
	});

	it("refuses an unknown protocol version", () => {
		expect(
			parseSceneMessage({
				type: "ping",
				protocolVersion: SCENE_PROTOCOL_VERSION + 1,
			}),
		).toBeNull();
	});

	it("refuses a message without a version", () => {
		expect(parseSceneMessage({ type: "ping" })).toBeNull();
	});

	it("refuses an unknown message type", () => {
		expect(
			parseSceneMessage({
				type: "explode",
				protocolVersion: SCENE_PROTOCOL_VERSION,
			}),
		).toBeNull();
	});

	it.each([null, undefined, 3, "ping", true])("refuses %p", (raw) => {
		expect(parseSceneMessage(raw)).toBeNull();
	});
});
