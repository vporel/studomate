import { DEFAULT_GRAFCET_FORMAT } from "@/schemas/grafcet/grafcet.schema";
import Project from "./project.schema";
import VariablesAddCommand from "./commands/variables-add.command";
import VariablesUpdateCommand from "./commands/variables-update.command";

function makeProject() {
	const project = new Project("p1", "Projet", "auteur");
	const g1 = project.createGrafcet("G1", DEFAULT_GRAFCET_FORMAT);
	const g2 = project.createGrafcet("G2", DEFAULT_GRAFCET_FORMAT);
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
