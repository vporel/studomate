import Project from "./project.schema";

describe("Project — énoncé de l'exercice", () => {
	it("un nouveau projet n'a pas d'énoncé", () => {
		expect(new Project("p1", "Projet", "auteur").exercise).toBeUndefined();
	});

	it("copy() conserve l'énoncé", () => {
		const project = new Project("p1", "Projet", "auteur");
		project.exercise = { statement: "## Consignes\n\nFaire X." };

		expect(project.copy().exercise).toEqual({
			statement: "## Consignes\n\nFaire X.",
		});
	});

	it("survit à un round-trip JSON", () => {
		const project = new Project("p1", "Projet", "auteur");
		project.exercise = { statement: "Énoncé **markdown**" };

		const roundTripped = Project.createFromJSON(JSON.stringify(project));

		expect(roundTripped.exercise).toEqual({ statement: "Énoncé **markdown**" });
	});

	it("un projet sérialisé sans énoncé se relit sans énoncé", () => {
		const project = new Project("p1", "Projet", "auteur");

		const roundTripped = Project.createFromJSON(JSON.stringify(project));

		expect(roundTripped.exercise).toBeUndefined();
	});
});
