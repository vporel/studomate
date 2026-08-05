import { Dialect } from "@/expression-language/dialect.enum";
import Ladder from "@/schemas/ladder/ladder.schema";
import Project from "./project.schema";

describe("Project — intégration Ladder", () => {
	it("createLadder ajoute un ladder au projet, accessible via ladders/getLadder", () => {
		const project = new Project("p1", "Projet", "");

		const ladder = project.createLadder("Mon ladder");

		expect(project.getLadder(ladder.id)).toBe(ladder);
		expect(project.ladders[ladder.id]).toBe(ladder);
	});

	it("ne mélange pas grafcets et ladders dans les accesseurs typés", () => {
		const project = new Project("p1", "Projet", "");
		project.createGrafcet("Mon grafcet", { type: "A4", orientation: "portrait" });
		const ladder = project.createLadder("Mon ladder");

		expect(Object.keys(project.ladders)).toEqual([ladder.id]);
		expect(Object.keys(project.grafcets)).toHaveLength(1);
	});

	it("createFromJSON reconstruit un ladder à partir de son type", () => {
		const project = new Project("p1", "Projet", "");
		const ladder = project.createLadder("Mon ladder");

		const restored = Project.createFromJSON(JSON.stringify(project));

		expect(restored.getLadder(ladder.id)).toBeInstanceOf(Ladder);
	});

	it("setDialect ne touche pas au ladder (pas d'expression textuelle dans ce périmètre)", () => {
		const project = new Project("p1", "Projet", "");
		const ladder = project.createLadder("Mon ladder");
		const section = ladder.sections[0];

		project.setDialect(Dialect.EN);

		expect(project.getLadder(ladder.id)!.sections[0]).toBe(section);
		expect(project.dialect).toBe(Dialect.EN);
	});
});
