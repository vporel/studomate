import Ladder from "@/schemas/ladder/ladder.schema";
import Project from "./project.schema";

describe("Project — programme Main", () => {
	it("crée automatiquement un Main à la création du projet", () => {
		const project = new Project("p1", "Projet", "");

		expect(project.main).toBeInstanceOf(Ladder);
		expect(project.main.role).toBe("main");
	});

	it("createMain refuse d'en créer un second", () => {
		const project = new Project("p1", "Projet", "");

		expect(() => project.createMain()).toThrow();
	});

	it("deleteProgram refuse de supprimer le Main", () => {
		const project = new Project("p1", "Projet", "");
		const mainId = project.main.id;

		project.deleteProgram(mainId);

		expect(project.getProgram(mainId)).toBeDefined();
	});

	it("deleteProgram supprime bien un ladder standard", () => {
		const project = new Project("p1", "Projet", "");
		const ladder = project.createLadder("Mon ladder");

		project.deleteProgram(ladder.id);

		expect(project.getProgram(ladder.id)).toBeUndefined();
	});

	it("le Main apparaît dans project.ladders au même titre qu'un ladder standard", () => {
		const project = new Project("p1", "Projet", "");

		expect(project.ladders[project.main.id]).toBe(project.main);
	});

	it("copy() préserve le Main du projet original", () => {
		const project = new Project("p1", "Projet", "");
		const mainId = project.main.id;

		const copy = project.copy();

		expect(copy.main.id).toBe(mainId);
		expect(copy.main.role).toBe("main");
	});

	it("createFromJSON reconstruit le Main du projet", () => {
		const project = new Project("p1", "Projet", "");
		const mainId = project.main.id;

		const restored = Project.createFromJSON(JSON.stringify(project));

		expect(restored.main.id).toBe(mainId);
		expect(restored.main.role).toBe("main");
	});
});
