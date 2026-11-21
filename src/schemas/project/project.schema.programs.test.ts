import Project from "./project.schema";

describe("Project.getAnalysedPrograms", () => {
	it("leaves out an empty grafcet", () => {
		const project = new Project("p1", "Projet", "");
		const grafcet = project.createGrafcet("Vide");

		expect(project.getAnalysedPrograms()).not.toContain(grafcet);
	});

	it("keeps an empty ladder", () => {
		const project = new Project("p1", "Projet", "");
		const ladder = project.createLadder("Vide");

		expect(project.getAnalysedPrograms()).toContain(ladder);
	});

	it("keeps a grafcet that is not empty", () => {
		const project = new Project("p1", "Projet", "");
		const grafcet = project.createGrafcet("Rempli");
		jest.spyOn(grafcet, "isEmpty").mockReturnValue(false);

		expect(project.getAnalysedPrograms()).toContain(grafcet);
	});

	it("leaves out a program excluded from execution", () => {
		const project = new Project("p1", "Projet", "");
		const ladder = project.createLadder("Illustratif");
		ladder.excludedFromExecution = true;

		expect(project.getAnalysedPrograms()).not.toContain(ladder);
	});
});
