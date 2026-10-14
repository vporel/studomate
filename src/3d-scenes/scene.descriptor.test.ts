import { createPointFactory } from "@/3d-scenes/scene.descriptor";

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
