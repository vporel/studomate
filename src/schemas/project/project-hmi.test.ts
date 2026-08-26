import HmiPage from "@/schemas/hmi/hmi-page.schema";
import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import Project from "./project.schema";

describe("Project — intégration HMI", () => {
	it("createHmiPage ajoute une page accessible via getHmiPage", () => {
		const project = new Project("p1", "Projet", "");

		const page = project.createHmiPage("Vue 1");

		expect(project.getHmiPage(page.id)).toBe(page);
		expect(project.hmiPages[page.id]).toBe(page);
	});

	it("deleteHmiPage retire la page du projet", () => {
		const project = new Project("p1", "Projet", "");
		const page = project.createHmiPage("Vue 1");

		project.deleteHmiPage(page.id);

		expect(project.getHmiPage(page.id)).toBeUndefined();
	});

	it("deleteHmiPage ignore un id inexistant", () => {
		const project = new Project("p1", "Projet", "");

		expect(() => project.deleteHmiPage("inconnu")).not.toThrow();
	});

	it("updateHmiPage remplace la page existante", () => {
		const project = new Project("p1", "Projet", "");
		const page = project.createHmiPage("Vue 1");
		const updated = page.copy();
		updated.name = "Vue modifiée";

		project.updateHmiPage(page.id, updated);

		expect(project.getHmiPage(page.id)!.name).toBe("Vue modifiée");
	});

	describe("copy", () => {
		it("copie les pages HMI avec leurs widgets", () => {
			const project = new Project("p1", "Projet", "");
			const page = project.createHmiPage("Vue 1");
			page.addWidget(HmiWidget.create("push-button", 10, 20));

			const copy = project.copy();

			expect(copy.hmiPages[page.id]).toBeDefined();
			expect(copy.hmiPages[page.id].widgets).toHaveLength(1);
		});

		it("les pages copiées sont indépendantes de l'original", () => {
			const project = new Project("p1", "Projet", "");
			const page = project.createHmiPage("Vue 1");
			const copy = project.copy();

			project.deleteHmiPage(page.id);

			expect(copy.hmiPages[page.id]).toBeDefined();
		});
	});

	describe("createFromJSON", () => {
		it("reconstruit les pages HMI avec leurs widgets", () => {
			const project = new Project("p1", "Projet", "");
			const page = project.createHmiPage("Vue 1");
			page.addWidget(HmiWidget.create("indicator", 50, 60));

			const restored = Project.createFromJSON(JSON.stringify(project));

			expect(restored.getHmiPage(page.id)).toBeInstanceOf(HmiPage);
			expect(restored.getHmiPage(page.id)!.widgets).toHaveLength(1);
		});

		it("tolère l'absence du champ hmiPages (projets antérieurs)", () => {
			const project = new Project("p1", "Projet", "");
			const json = JSON.parse(JSON.stringify(project));
			delete json.hmiPages;

			const restored = Project.createFromJSON(JSON.stringify(json));

			expect(restored.hmiPages).toEqual({});
		});
	});
});

describe("Project — page HMI principale", () => {
	it("la première page créée devient automatiquement la page principale", () => {
		const project = new Project("p1", "Projet", "");

		const page = project.createHmiPage("Vue 1");

		expect(page.isMain).toBe(true);
		expect(project.getMainHmiPage()).toBe(page);
	});

	it("les pages créées ensuite ne sont pas principales", () => {
		const project = new Project("p1", "Projet", "");
		project.createHmiPage("Vue 1");

		const second = project.createHmiPage("Vue 2");

		expect(second.isMain).toBe(false);
	});

	it("setMainHmiPage change la page principale et retire le statut à l'ancienne", () => {
		const project = new Project("p1", "Projet", "");
		const first = project.createHmiPage("Vue 1");
		const second = project.createHmiPage("Vue 2");

		project.setMainHmiPage(second.id);

		expect(first.isMain).toBe(false);
		expect(second.isMain).toBe(true);
		expect(project.getMainHmiPage()).toBe(second);
	});

	it("getMainHmiPage retombe sur la première page si aucune n'est marquée principale", () => {
		const project = new Project("p1", "Projet", "");
		const page = project.createHmiPage("Vue 1");
		page.isMain = false;

		expect(project.getMainHmiPage()).toBe(page);
	});

	it("getMainHmiPage retourne undefined si le projet n'a aucune page HMI", () => {
		const project = new Project("p1", "Projet", "");

		expect(project.getMainHmiPage()).toBeUndefined();
	});
});

describe("Project.nextHmiPageName", () => {
	it("génère Label_1 quand aucune page ne porte ce nom", () => {
		const project = new Project("p1", "Projet", "");

		expect(project.nextHmiPageName("Vue HMI")).toBe("Vue HMI_1");
	});

	it("avance au premier numéro libre", () => {
		const project = new Project("p1", "Projet", "");
		project.createHmiPage("Vue HMI_1");

		expect(project.nextHmiPageName("Vue HMI")).toBe("Vue HMI_2");
	});
});
