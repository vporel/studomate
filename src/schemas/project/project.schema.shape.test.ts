import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import Ladder from "@/schemas/ladder/ladder.schema";
import Project from "./project.schema";

function rawProject(): Record<string, any> {
	const project = new Project("p1", "Projet", "Enseignante");
	project.addProgram(new GrafcetBuilder().id("g1").build());
	project.addProgram(new Ladder("l1", "Ladder 1"));
	return JSON.parse(JSON.stringify(project));
}

describe("Project.hasValidShape", () => {
	it("accepts a serialized project", () => {
		expect(Project.hasValidShape(rawProject())).toBe(true);
	});

	it("accepts a project without HMI pages", () => {
		const raw = rawProject();
		delete raw.hmiPages;

		expect(Project.hasValidShape(raw)).toBe(true);
	});

	it.each([null, 42, "project", []])("rejects %p", (raw) => {
		expect(Project.hasValidShape(raw)).toBe(false);
	});

	it("rejects an object that is not a project", () => {
		expect(Project.hasValidShape({ foo: 1 })).toBe(false);
	});

	it.each<[string, (raw: Record<string, any>) => void]>([
		["no name", (raw) => delete raw.name],
		["variables not an array", (raw) => (raw.variables = {})],
		["programs not an object", (raw) => (raw.programs = [])],
		["HMI pages not an object", (raw) => (raw.hmiPages = [])],
		["a program of unknown type", (raw) => (raw.programs.g1.type = "sfc")],
		["a program without name", (raw) => delete raw.programs.g1.name],
		[
			"a program whose id differs from its key",
			(raw) => (raw.programs.l1.id = "other"),
		],
		["a program that is not an object", (raw) => (raw.programs.g1 = 3)],
	])("rejects %s", (_, patch) => {
		const raw = rawProject();
		patch(raw);

		expect(Project.hasValidShape(raw)).toBe(false);
	});
});
