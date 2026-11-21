import Project from "@/schemas/project/project.schema";
import { getHmiPageData, getProgramPageData } from "./pages-data";

describe("getProgramPageData", () => {
	it("describes a grafcet by its id, name and notation", () => {
		const project = new Project("p1", "Projet", "");
		const grafcet = project.createGrafcet("Cycle");

		expect(getProgramPageData(grafcet)).toEqual({
			id: grafcet.id,
			type: "grafcet",
			title: "Cycle",
		});
	});

	it("describes a ladder by its id, name and notation", () => {
		const project = new Project("p1", "Projet", "");
		const ladder = project.createLadder("Sorties");

		expect(getProgramPageData(ladder)).toEqual({
			id: ladder.id,
			type: "ladder",
			title: "Sorties",
		});
	});
});

describe("getHmiPageData", () => {
	it("describes an HMI page with the hmi type", () => {
		const project = new Project("p1", "Projet", "");
		const page = project.createHmiPage("Synoptique");

		expect(getHmiPageData(page)).toEqual({
			id: page.id,
			type: "hmi",
			title: "Synoptique",
		});
	});
});
