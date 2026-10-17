import type { Scene3d } from "../3d-scene/scene3d.schema";
import Project from "./project.schema";

const scene: Scene3d = {
	sceneId: "carton-sorting",
	sceneVersion: 1,
	bindings: { t1: "var-1", cartonAtStation: "var-2" },
};

describe("Project scene3d", () => {
	it("a new project has no scene", () => {
		expect(new Project("p1", "Projet", "auteur").scene3d).toBeUndefined();
	});

	it("copy() keeps the scene", () => {
		const project = new Project("p1", "Projet", "auteur");
		project.scene3d = scene;

		expect(project.copy().scene3d).toEqual(scene);
	});

	it("survives a JSON round trip", () => {
		const project = new Project("p1", "Projet", "auteur");
		project.scene3d = scene;

		const roundTripped = Project.createFromJSON(JSON.stringify(project));

		expect(roundTripped.scene3d).toEqual(scene);
	});

	it("a project saved without the field loads without a scene", () => {
		const project = new Project("p1", "Projet", "auteur");
		const json = JSON.parse(JSON.stringify(project));
		delete json.scene3d;

		expect(Project.createFromJSON(JSON.stringify(json)).scene3d).toBe(
			undefined,
		);
	});

	it("a null scene survives a JSON round trip as null", () => {
		const project = new Project("p1", "Projet", "auteur");
		project.scene3d = null;

		expect(Project.createFromJSON(JSON.stringify(project)).scene3d).toBeNull();
	});
});
