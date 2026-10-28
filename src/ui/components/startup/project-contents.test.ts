import { createContactElement } from "@/schemas/ladder/element.schema";
import Project from "@/schemas/project/project.schema";
import { projectContents } from "./project-contents";

const emptyProject = () => {
	const project = new Project("p1", "Projet", "auteur");
	project.programs = {};
	return project;
};

describe("projectContents", () => {
	it("ne liste rien pour un projet vide", () => {
		expect(projectContents(emptyProject())).toEqual([]);
	});

	it("liste chaque notation une seule fois, dans un ordre fixe", () => {
		const project = emptyProject();
		project.createLadder("L1");
		project.createGrafcet("G1");
		project.createGrafcet("G2");

		expect(projectContents(project)).toEqual(["grafcet", "ladder"]);
	});

	it("ajoute les pages HMI puis la scène 3D", () => {
		const project = emptyProject();
		project.createGrafcet("G1");
		project.createHmiPage("Vue 1");
		project.scene3d = { sceneId: "crossroads", sceneVersion: 1, bindings: {} };

		expect(projectContents(project)).toEqual(["grafcet", "hmi", "scene3d"]);
	});

	it("ignore une scène 3D explicitement absente", () => {
		const project = emptyProject();
		project.scene3d = null;

		expect(projectContents(project)).toEqual([]);
	});

	describe("Main", () => {
		it("ne compte pas comme du Ladder tant qu'il est vide", () => {
			const project = new Project("p1", "Projet", "auteur");
			project.createGrafcet("G1");

			expect(projectContents(project)).toEqual(["grafcet"]);
		});

		it("compte comme du Ladder dès qu'il porte un élément", () => {
			const project = new Project("p1", "Projet", "auteur");
			const main = Object.values(project.ladders)[0];
			main.addElements(main.sections[0].id, [
				createContactElement("A", "NO", 0, 0),
			]);

			expect(projectContents(project)).toEqual(["ladder"]);
		});

		it("laisse un autre ladder compter même vide, à côté d'un Main vide", () => {
			const project = new Project("p1", "Projet", "auteur");
			project.createLadder("L1");

			expect(projectContents(project)).toEqual(["ladder"]);
		});
	});

	it("compte un programme exclu de l'exécution", () => {
		const project = emptyProject();
		project.createGrafcet("G1").excludedFromExecution = true;

		expect(projectContents(project)).toEqual(["grafcet"]);
	});
});
