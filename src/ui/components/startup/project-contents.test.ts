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
});
