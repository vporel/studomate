import Project from "../project.schema";
import VariablesAddCommand from "./variables-add.command";

describe("VariablesAddCommand", () => {
	it("ajoute une variable sans address ni comment, et l'annulation la retire", () => {
		const project = new Project("p1", "Projet", "");
		const command = new VariablesAddCommand([{ id: "v1", mnemonic: "A", zone: "memory", type: "BOOL" }]);

		const [, isValid] = command.execute(project);

		expect(isValid).toBe(true);
		expect(project.variables).toHaveLength(1);
		expect(project.variables[0]).toMatchObject({ id: "v1", mnemonic: "A", address: "", comment: "" });

		command.cancel(project);

		expect(project.variables).toHaveLength(0);
	});

	it("ajoute une variable avec address et comment", () => {
		const project = new Project("p1", "Projet", "");
		const command = new VariablesAddCommand([
			{ id: "v1", mnemonic: "A", zone: "logic-input", type: "BOOL", address: "%I0.0", comment: "capteur" },
		]);

		command.execute(project);

		expect(project.variables[0]).toMatchObject({ address: "%I0.0", comment: "capteur" });
	});

	it("l'annulation ne retire que les variables de la charge utile", () => {
		const project = new Project("p1", "Projet", "");
		const preexisting = new VariablesAddCommand([
			{ id: "existing", mnemonic: "EXISTING", zone: "memory", type: "BOOL" },
		]);
		preexisting.execute(project);
		const command = new VariablesAddCommand([{ id: "v1", mnemonic: "A", zone: "memory", type: "BOOL" }]);

		command.execute(project);
		command.cancel(project);

		expect(project.variables.map((v) => v.id)).toEqual(["existing"]);
	});

	it("round-trip execute→cancel laisse le projet inchangé", () => {
		const project = new Project("p1", "Projet", "");
		const before = JSON.stringify(project);
		const command = new VariablesAddCommand([{ id: "v1", mnemonic: "A", zone: "memory", type: "BOOL" }]);

		command.execute(project);
		command.cancel(project);

		expect(JSON.stringify(project)).toBe(before);
	});
});
