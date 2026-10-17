import { Dialect } from "@/expression-language/dialect.enum";
import Project from "../project.schema";
import VariablesAddCommand from "./variables-add.command";

describe("VariablesAddCommand", () => {
	it("ajoute une variable sans address ni comment, et l'annulation la retire", () => {
		const project = new Project("p1", "Projet", "");
		const command = new VariablesAddCommand([
			{ id: "v1", mnemonic: "A", zone: "memory", type: "BOOL" },
		]);

		const [, isValid] = command.execute(project);

		expect(isValid).toBe(true);
		expect(project.variables).toHaveLength(1);
		expect(project.variables[0]).toMatchObject({
			id: "v1",
			mnemonic: "A",
			address: "",
			comment: "",
		});

		command.cancel(project);

		expect(project.variables).toHaveLength(0);
	});

	it("ajoute une variable avec address et comment", () => {
		const project = new Project("p1", "Projet", "");
		const command = new VariablesAddCommand([
			{
				id: "v1",
				mnemonic: "A",
				zone: "logic-input",
				type: "BOOL",
				address: "%I0.0",
				comment: "capteur",
			},
		]);

		command.execute(project);

		expect(project.variables[0]).toMatchObject({
			address: "%I0.0",
			comment: "capteur",
		});
	});

	it("l'annulation ne retire que les variables de la charge utile", () => {
		const project = new Project("p1", "Projet", "");
		const preexisting = new VariablesAddCommand([
			{ id: "existing", mnemonic: "EXISTING", zone: "memory", type: "BOOL" },
		]);
		preexisting.execute(project);
		const command = new VariablesAddCommand([
			{ id: "v1", mnemonic: "A", zone: "memory", type: "BOOL" },
		]);

		command.execute(project);
		command.cancel(project);

		expect(project.variables.map((v) => v.id)).toEqual(["existing"]);
	});

	it("round-trip execute→cancel laisse le projet inchangé", () => {
		const project = new Project("p1", "Projet", "");
		const before = JSON.stringify(project);
		const command = new VariablesAddCommand([
			{ id: "v1", mnemonic: "A", zone: "memory", type: "BOOL" },
		]);

		command.execute(project);
		command.cancel(project);

		expect(JSON.stringify(project)).toBe(before);
	});
});

describe("VariablesAddCommand constants", () => {
	it("copies the declared value of a constant and cancel removes it", () => {
		const project = new Project("p1", "Projet", "");
		const command = new VariablesAddCommand([
			{ id: "k", mnemonic: "K", zone: "constant", type: "TIME", value: "T#5s" },
		]);

		command.execute(project);

		expect(project.variables[0]).toMatchObject({
			zone: "constant",
			value: "T#5s",
		});
		command.cancel(project);
		expect(project.variables).toHaveLength(0);
	});

	it("validates a boolean constant with the dialect of the project", () => {
		const project = new Project("p1", "Projet", "");
		project.dialect = Dialect.EN;

		new VariablesAddCommand([
			{ id: "k", mnemonic: "K", zone: "constant", type: "BOOL", value: "TRUE" },
		]).execute(project);

		expect(project.variables[0].value).toBe("TRUE");
	});

	it("refuses a constant without value", () => {
		const project = new Project("p1", "Projet", "");
		const command = new VariablesAddCommand([
			{ id: "k", mnemonic: "K", zone: "constant", type: "INT" },
		]);

		expect(() => command.execute(project)).toThrow("CONSTANT_VALUE_MISSING");
	});
});
