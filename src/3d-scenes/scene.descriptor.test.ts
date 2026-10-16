import {
	createPointFactory,
	parseSceneKey,
	sceneKey,
} from "@/3d-scenes/scene.descriptor";

describe("createPointFactory", () => {
	it("builds a point with the prefixed label key", () => {
		const point = createPointFactory("demo.points");
		expect(point("lamp", "actuator", "boolean", "lampe")).toEqual({
			id: "lamp",
			kind: "actuator",
			valueType: "boolean",
			labelKey: "demo.points.lamp",
			suggestedMnemonic: "lampe",
		});
	});

	it("keeps the kind and value type it is given", () => {
		const point = createPointFactory("demo.points");
		const built = point("pos", "sensor", "number", "position");
		expect(built.kind).toBe("sensor");
		expect(built.valueType).toBe("number");
	});
});

describe("sceneKey", () => {
	it("round-trips an id and a version", () => {
		expect(sceneKey("carton-sorting", 2)).toBe("carton-sorting@2");
		expect(parseSceneKey("carton-sorting@2")).toEqual({
			id: "carton-sorting",
			version: 2,
		});
	});

	it("rejects keys that are not a scene key", () => {
		expect(parseSceneKey("elevator")).toBeNull();
		expect(parseSceneKey("@1")).toBeNull();
		expect(parseSceneKey("elevator@x")).toBeNull();
		expect(parseSceneKey("elevator@1.5")).toBeNull();
	});
});
