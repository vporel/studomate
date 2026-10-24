import type { HardwareTarget } from "../hardware/hardware-target.schema";
import Project from "./project.schema";

const target: HardwareTarget = {
	modelId: "arduino-uno-r3",
	pins: { "%PD2": { mode: "INPUT", inverted: false } },
};

describe("Project hardwareTarget", () => {
	it("a new project has no target", () => {
		expect(new Project("p1", "Projet", "auteur").hardwareTarget).toBeUndefined();
	});

	it("copy() keeps the target", () => {
		const project = new Project("p1", "Projet", "auteur");
		project.hardwareTarget = target;

		expect(project.copy().hardwareTarget).toEqual(target);
	});

	it("survives a JSON round trip", () => {
		const project = new Project("p1", "Projet", "auteur");
		project.hardwareTarget = target;

		const roundTripped = Project.createFromJSON(JSON.stringify(project));

		expect(roundTripped.hardwareTarget).toEqual(target);
	});

	it("a project saved without the field loads without a target", () => {
		const project = new Project("p1", "Projet", "auteur");
		const json = JSON.parse(JSON.stringify(project));
		delete json.hardwareTarget;

		expect(Project.createFromJSON(JSON.stringify(json)).hardwareTarget).toBe(
			undefined,
		);
	});

	it("a null target survives a JSON round trip as null", () => {
		const project = new Project("p1", "Projet", "auteur");
		project.hardwareTarget = null;

		expect(
			Project.createFromJSON(JSON.stringify(project)).hardwareTarget,
		).toBeNull();
	});
});
