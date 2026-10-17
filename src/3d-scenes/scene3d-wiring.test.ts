import type { Scene3d } from "@/schemas/3d-scene/scene3d.schema";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import { getSceneDescriptor } from "./scene.registry";
import {
	getCandidateVariables,
	getExpectedZones,
	isVariableCompatible,
	planMissingVariables,
} from "./scene3d-wiring";

const elevator = getSceneDescriptor("elevator", 1)!;
const point = (id: string) => elevator.points.find((p) => p.id === id)!;
const emptyScene: Scene3d = {
	sceneId: "elevator",
	sceneVersion: 1,
	bindings: {},
};

describe("scene3d-wiring", () => {
	it("expects inputs for sensors and outputs for actuators", () => {
		expect(getExpectedZones("sensor")).toEqual(["logic-input", "analog-input"]);
		expect(getExpectedZones("actuator")).toEqual([
			"logic-output",
			"analog-output",
		]);
	});

	it("expects a memory variable for a display", () => {
		expect(getExpectedZones("display")).toEqual(["memory"]);
	});

	it("filters candidate variables by direction and native type", () => {
		const variables = [
			VariableBuilder.buildLogicInput("a", "a"),
			VariableBuilder.buildLogicOutput("b", "b"),
			VariableBuilder.buildAnalogInput("c", "c"),
		];
		expect(
			getCandidateVariables(point("floor0"), variables).map((v) => v.id),
		).toEqual(["a"]);
		expect(
			getCandidateVariables(point("up"), variables).map((v) => v.id),
		).toEqual(["b"]);
		expect(
			getCandidateVariables(point("cabinPosition"), variables).map((v) => v.id),
		).toEqual(["c"]);
		expect(isVariableCompatible(point("up"), variables[2])).toBe(false);
	});

	describe("planMissingVariables", () => {
		it("creates every point with the right zone and type when nothing exists", () => {
			const plan = planMissingVariables(elevator, emptyScene, []);

			expect(plan.reused).toEqual({});
			expect(plan.toCreate).toHaveLength(elevator.points.length);
			expect(plan.toCreate.find((c) => c.pointId === "up")!.fields).toEqual({
				mnemonic: "monter",
				zone: "logic-output",
				type: "BOOL",
			});
			expect(
				plan.toCreate.find((c) => c.pointId === "cabinPosition")!.fields,
			).toEqual({ mnemonic: "position", zone: "analog-input", type: "INT" });
		});

		it("reuses a compatible variable carrying the suggested mnemonic", () => {
			const existing = VariableBuilder.buildLogicOutput("v-up", "monter");
			const plan = planMissingVariables(elevator, emptyScene, [existing]);

			expect(plan.reused).toEqual({ up: "v-up" });
			expect(plan.toCreate.some((c) => c.pointId === "up")).toBe(false);
		});

		it("leaves a point unbound when its mnemonic belongs to an incompatible variable", () => {
			const clash = VariableBuilder.buildLogicInput("v-up", "monter");
			const plan = planMissingVariables(elevator, emptyScene, [clash]);

			expect(plan.reused).toEqual({});
			expect(plan.toCreate.some((c) => c.pointId === "up")).toBe(false);
		});

		it("leaves a point unbound when its mnemonic belongs to a variable already bound to another point", () => {
			const taken = VariableBuilder.buildLogicOutput("v-up", "monter");
			const plan = planMissingVariables(
				elevator,
				{ sceneId: "elevator", sceneVersion: 1, bindings: { down: "v-up" } },
				[taken],
			);

			expect(plan.reused).toEqual({});
			expect(plan.toCreate.some((c) => c.pointId === "up")).toBe(false);
		});

		it("keeps points already bound to an existing variable", () => {
			const bound = VariableBuilder.buildLogicOutput("v-x", "autre");
			const plan = planMissingVariables(
				elevator,
				{ sceneId: "elevator", sceneVersion: 1, bindings: { up: "v-x" } },
				[bound],
			);

			expect(plan.toCreate.some((c) => c.pointId === "up")).toBe(false);
			expect(plan.reused.up).toBeUndefined();
		});

		it("rebinds a point whose variable was deleted", () => {
			const plan = planMissingVariables(
				elevator,
				{ sceneId: "elevator", sceneVersion: 1, bindings: { up: "gone" } },
				[],
			);

			expect(plan.toCreate.some((c) => c.pointId === "up")).toBe(true);
		});
	});

	describe("display point", () => {
		const cartonSorting = getSceneDescriptor("carton-sorting", 1)!;
		const counter = cartonSorting.points.find((p) => p.id === "counter")!;

		it("accepts a numeric memory variable only", () => {
			const variables = [
				VariableBuilder.buildMemoryInt("m", "m"),
				VariableBuilder.buildMemoryBool("b", "b"),
				VariableBuilder.buildAnalogOutput("o", "o"),
				VariableBuilder.buildAnalogInput("i", "i"),
			];
			expect(
				getCandidateVariables(counter, variables).map((v) => v.id),
			).toEqual(["m"]);
		});

		it("is created as an integer memory variable, or reuses the one named like it", () => {
			const scene: Scene3d = {
				sceneId: "carton-sorting",
				sceneVersion: 1,
				bindings: {},
			};
			const created = planMissingVariables(cartonSorting, scene, []);
			expect(
				created.toCreate.find((c) => c.pointId === "counter")!.fields,
			).toEqual({ mnemonic: "C", zone: "memory", type: "INT" });

			const existing = VariableBuilder.buildMemoryInt("c-id", "C");
			const reused = planMissingVariables(cartonSorting, scene, [existing]);
			expect(reused.reused.counter).toBe("c-id");
		});
	});
});
