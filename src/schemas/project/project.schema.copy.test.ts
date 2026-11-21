import Project from "./project.schema";
import VariablesAddCommand from "./commands/variables-add.command";
import VariablesUpdateCommand from "./commands/variables-update.command";

function makeProject() {
	const project = new Project("p1", "Projet", "auteur");
	const g1 = project.createGrafcet("G1");
	const g2 = project.createGrafcet("G2");
	new VariablesAddCommand([
		{ id: "v1", mnemonic: "A", zone: "memory", type: "BOOL" },
	]).execute(project);
	return { project, g1, g2, mainId: project.main.id };
}

describe("Project.copy", () => {
	it("clone en profondeur les programmes, réutilise le tableau de variables à l'identité près", () => {
		const { project, g1 } = makeProject();

		const copy = project.copy();

		expect(copy).toBeInstanceOf(Project);
		expect(copy.getGrafcet(g1.id)).not.toBe(g1);
		expect(copy.getGrafcet(g1.id)!.id).toBe(g1.id);
		expect(copy.variables).not.toBe(project.variables);
		// Les `Variable` sont immuables : les instances inchangées sont partagées entre projet et copie.
		expect(copy.variables[0]).toBe(project.variables[0]);
		expect(copy.variables[0].id).toBe("v1");
	});

	it("muter une variable de la copie via une commande n'affecte pas l'original", () => {
		const { project } = makeProject();

		const copy = project.copy();
		new VariablesUpdateCommand([
			{ id: "v1", newData: { mnemonic: "B" }, oldData: { mnemonic: "A" } },
		]).execute(copy);

		expect(copy.variables[0].mnemonic).toBe("B");
		expect(project.variables[0].mnemonic).toBe("A");
	});

	it("détache les instances Date : la copie ne partage pas les dates de l'original", () => {
		const { project } = makeProject();

		const copy = project.copy();

		expect(copy.creationDate).not.toBe(project.creationDate);
		expect(copy.creationDate.getTime()).toBe(project.creationDate.getTime());
		expect(copy.lastModificationDate).not.toBe(project.lastModificationDate);
		expect(copy.lastModificationDate.getTime()).toBe(
			project.lastModificationDate.getTime(),
		);

		copy.creationDate.setFullYear(1999);
		expect(project.creationDate.getFullYear()).not.toBe(1999);
	});
});

describe("Project.copyWithProgram", () => {
	it("remplace uniquement le programme fourni, à l'identité près", () => {
		const { project, g1 } = makeProject();
		const edited = g1.copy();
		edited.name = "G1 modifié";

		const next = project.copyWithProgram(edited);

		expect(next).toBeInstanceOf(Project);
		expect(next.getGrafcet(g1.id)).toBe(edited);
	});

	it("réutilise par référence les autres programmes, les variables et les pages HMI", () => {
		const { project, g1, g2, mainId } = makeProject();
		const edited = g1.copy();

		const next = project.copyWithProgram(edited);

		expect(next.getGrafcet(g2.id)).toBe(project.getGrafcet(g2.id));
		expect(next.getProgram(mainId)).toBe(project.getProgram(mainId));
		expect(next.variables).toBe(project.variables);
		expect(next.hmiPages).toBe(project.hmiPages);
	});

	it("ne partage pas le record `programs` : muter la copie ne touche pas l'original", () => {
		const { project, g1 } = makeProject();

		const next = project.copyWithProgram(g1.copy());
		next.deleteProgram(g1.id);

		expect(next.getGrafcet(g1.id)).toBeUndefined();
		expect(project.getGrafcet(g1.id)).toBeDefined();
	});

	it("conserve l'identité du projet (id, nom, auteur, dialecte)", () => {
		const { project, g1 } = makeProject();

		const next = project.copyWithProgram(g1.copy());

		expect(next.id).toBe(project.id);
		expect(next.name).toBe(project.name);
		expect(next.author).toBe(project.author);
		expect(next.dialect).toBe(project.dialect);
	});
});

describe("Project.copyWithHmiPage", () => {
	function makeProjectWithPages() {
		const { project, g1, mainId } = makeProject();
		const page1 = project.createHmiPage("Vue 1");
		const page2 = project.createHmiPage("Vue 2");
		return { project, g1, mainId, page1, page2 };
	}

	it("remplace la page de même id, adoptée telle quelle", () => {
		const { project, page1 } = makeProjectWithPages();
		const edited = page1.copy();
		edited.name = "Vue 1 modifiée";

		const next = project.copyWithHmiPage(edited);

		expect(next).toBeInstanceOf(Project);
		expect(next.getHmiPage(page1.id)).toBe(edited);
		expect(project.getHmiPage(page1.id)!.name).toBe("Vue 1");
	});

	it("réutilise par référence les autres pages, les programmes et les variables", () => {
		const { project, g1, mainId, page1, page2 } = makeProjectWithPages();

		const next = project.copyWithHmiPage(page1.copy());

		expect(next.getHmiPage(page2.id)).toBe(page2);
		expect(next.getGrafcet(g1.id)).toBe(g1);
		expect(next.getProgram(mainId)).toBe(project.getProgram(mainId));
		expect(next.variables).toBe(project.variables);
	});

	it("ne partage ni le record `hmiPages` ni le record `programs` avec l'original", () => {
		const { project, g1, page2 } = makeProjectWithPages();

		const next = project.copyWithHmiPage(project.getHmiPage(page2.id)!.copy());
		next.deleteHmiPage(page2.id);
		next.deleteProgram(g1.id);

		expect(next.getHmiPage(page2.id)).toBeUndefined();
		expect(project.getHmiPage(page2.id)).toBeDefined();
		expect(next.getGrafcet(g1.id)).toBeUndefined();
		expect(project.getGrafcet(g1.id)).toBeDefined();
	});

	it("conserve l'identité du projet (id, nom, auteur, dialecte)", () => {
		const { project, page1 } = makeProjectWithPages();

		const next = project.copyWithHmiPage(page1.copy());

		expect(next.id).toBe(project.id);
		expect(next.name).toBe(project.name);
		expect(next.author).toBe(project.author);
		expect(next.dialect).toBe(project.dialect);
	});
});
