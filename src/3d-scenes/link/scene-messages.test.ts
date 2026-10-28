import {
	SCENE_PROTOCOL_VERSION,
	foreignVersionMessageType,
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

	it("recognises a message of this protocol sent by another version", () => {
		expect(
			foreignVersionMessageType({
				type: "ping",
				protocolVersion: SCENE_PROTOCOL_VERSION + 1,
			}),
		).toBe("ping");
	});

	it.each([
		{ type: "ping", protocolVersion: SCENE_PROTOCOL_VERSION },
		{ type: "ping" },
		{ type: "explode", protocolVersion: SCENE_PROTOCOL_VERSION + 1 },
		{ type: "ping", protocolVersion: "2" },
		null,
		"ping",
	])("does not take %p for a foreign-version message", (raw) => {
		expect(foreignVersionMessageType(raw)).toBeNull();
	});

	it.each([null, undefined, 3, "ping", true])("refuses %p", (raw) => {
		expect(parseSceneMessage(raw)).toBeNull();
	});
});
