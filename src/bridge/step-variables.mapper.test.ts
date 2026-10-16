import Project from "@/schemas/project/project.schema";
import { getStepVariables } from "./step-variables.mapper";

describe("getStepVariables", () => {
	it("returns no variable when the project has no grafcet step", () => {
		const project = new Project("p1", "Project", "");
		expect(getStepVariables(project)).toEqual([]);
	});

	it("exposes X{n} for the numbered steps of every grafcet", () => {
		const project = new Project("p1", "Project", "");
		const g1 = project.createGrafcet("G1");
		const g2 = project.createGrafcet("G2");
		g1.addElements([{
			id: "s0",
			type: "step",
			position: { x: 0, y: 0 },
			data: { number: 0, initial: true },
		}]);
		g2.addElements([{
			id: "s5",
			type: "step",
			position: { x: 0, y: 0 },
			data: { number: 5 },
		}]);

		const variables = getStepVariables(project);

		expect(variables.map((v) => v.mnemonic).sort()).toEqual(["X0", "X5"]);
		expect(variables.every((v) => v.type === "BOOL")).toBe(true);
	});

	it("ignores grafcets excluded from execution", () => {
		const project = new Project("p1", "Project", "");
		const g1 = project.createGrafcet("G1");
		g1.addElements([{
			id: "s1",
			type: "step",
			position: { x: 0, y: 0 },
			data: { number: 1 },
		}]);
		g1.excludedFromExecution = true;

		expect(getStepVariables(project)).toEqual([]);
	});
});
