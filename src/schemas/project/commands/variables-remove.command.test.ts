import Project from "../project.schema";
import VariablesAddCommand from "./variables-add.command";
import VariablesRemoveCommand from "./variables-remove.command";

describe("VariablesRemoveCommand", () => {
	function projectWithVariables(): Project {
		const project = new Project("p1", "Projet", "");
		new VariablesAddCommand([
			{
				id: "v1",
				mnemonic: "A",
				zone: "logic-input",
				type: "BOOL",
				address: "%I0.0",
				comment: "capteur",
			},
			{ id: "v2", mnemonic: "B", zone: "memory", type: "BOOL" },
		]).execute(project);
		return project;
	}

	it("retire les variables de la charge utile, et l'annulation les restaure", () => {
		const project = projectWithVariables();
		const command = new VariablesRemoveCommand([
			{
				id: "v1",
				mnemonic: "A",
				zone: "logic-input",
				type: "BOOL",
				address: "%I0.0",
				comment: "capteur",
			},
		]);

		const [, isValid] = command.execute(project);

		expect(isValid).toBe(true);
		expect(project.variables.map((v) => v.id)).toEqual(["v2"]);

		command.cancel(project);

		expect(project.variables.map((v) => v.id).sort()).toEqual(["v1", "v2"]);
		expect(project.variables.find((v) => v.id === "v1")).toMatchObject({
			address: "%I0.0",
			comment: "capteur",
		});
	});

	it("round-trip execute→cancel laisse le projet inchangé", () => {
		const project = projectWithVariables();
		const before = JSON.stringify(project);
		const command = new VariablesRemoveCommand([
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
		command.cancel(project);

		expect(
			JSON.parse(JSON.stringify(project)).variables.sort((a: any, b: any) =>
				a.id.localeCompare(b.id),
			),
		).toEqual(
			JSON.parse(before).variables.sort((a: any, b: any) =>
				a.id.localeCompare(b.id),
			),
		);
	});
});
