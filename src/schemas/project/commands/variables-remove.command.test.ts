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

	it("restaure le comportement d'entrée à l'annulation", () => {
		const project = new Project("p1", "Projet", "");
		const payload = {
			id: "v1",
			mnemonic: "arret",
			zone: "logic-input" as const,
			type: "BOOL" as const,
			behavior: { kind: "push-button-nc" as const, params: null },
		};
		new VariablesAddCommand([payload]).execute(project);
		const command = new VariablesRemoveCommand([payload]);

		command.execute(project);
		command.cancel(project);

		expect(project.variables[0].behavior).toEqual({
			kind: "push-button-nc",
			params: null,
		});
	});
});

describe("VariablesRemoveCommand round trip", () => {
	it("restaure address, comment et behavior après remove puis cancel", () => {
		const project = new Project("p1", "Projet", "");
		const payload = [
			{
				id: "v1",
				mnemonic: "arret",
				zone: "logic-input" as const,
				type: "BOOL" as const,
				address: "%I0.0",
				comment: "bouton",
				behavior: { kind: "push-button-nc" as const, params: null },
			},
		];
		new VariablesAddCommand(payload).execute(project);
		const added = JSON.stringify(project.variables);
		const command = new VariablesRemoveCommand(payload);

		command.execute(project);
		expect(project.variables).toEqual([]);
		command.cancel(project);

		expect(JSON.stringify(project.variables)).toBe(added);
		expect(project.variables[0]).toMatchObject({
			address: "%I0.0",
			comment: "bouton",
			behavior: { kind: "push-button-nc", params: null },
		});
	});
});

describe("VariablesRemoveCommand constants", () => {
	it("cancel restores a constant with its value", () => {
		const project = new Project("p1", "Projet", "");
		const payload = [
			{
				id: "k",
				mnemonic: "K",
				zone: "constant" as const,
				type: "INT" as const,
				value: "42",
			},
		];
		new VariablesAddCommand(payload).execute(project);
		const command = new VariablesRemoveCommand(payload);

		command.execute(project);
		expect(project.variables).toHaveLength(0);
		command.cancel(project);

		expect(project.variables[0]).toMatchObject({
			zone: "constant",
			value: "42",
		});
	});
});

describe("VariablesRemoveCommand order", () => {
	const draft = (id: string) => ({
		id,
		mnemonic: id.toUpperCase(),
		zone: "memory" as const,
		type: "BOOL" as const,
	});
	const ids = (project: Project) => project.variables.map((v) => v.id);

	function projectWith(...names: string[]): Project {
		const project = new Project("p1", "Projet", "");
		new VariablesAddCommand(names.map(draft)).execute(project);
		return project;
	}

	it("remet une variable du milieu à sa place d'origine", () => {
		const project = projectWith("a", "b", "c", "d");
		const command = new VariablesRemoveCommand([{ ...draft("b"), index: 1 }]);

		command.execute(project);
		expect(ids(project)).toEqual(["a", "c", "d"]);
		command.cancel(project);

		expect(ids(project)).toEqual(["a", "b", "c", "d"]);
	});

	it("remet plusieurs variables non contiguës à leurs places, quel que soit l'ordre du payload", () => {
		const project = projectWith("a", "b", "c", "d", "e");
		const command = new VariablesRemoveCommand([
			{ ...draft("d"), index: 3 },
			{ ...draft("b"), index: 1 },
		]);

		command.execute(project);
		expect(ids(project)).toEqual(["a", "c", "e"]);
		command.cancel(project);

		expect(ids(project)).toEqual(["a", "b", "c", "d", "e"]);
	});

	it("remet des variables contiguës et la première et la dernière", () => {
		const project = projectWith("a", "b", "c", "d");
		const command = new VariablesRemoveCommand([
			{ ...draft("a"), index: 0 },
			{ ...draft("b"), index: 1 },
			{ ...draft("d"), index: 3 },
		]);

		command.execute(project);
		command.cancel(project);

		expect(ids(project)).toEqual(["a", "b", "c", "d"]);
	});

	it("ajoute en fin de liste une variable sans position", () => {
		const project = projectWith("a", "b", "c");
		const command = new VariablesRemoveCommand([draft("a")]);

		command.execute(project);
		command.cancel(project);

		expect(ids(project)).toEqual(["b", "c", "a"]);
	});

	it("borne une position au-delà de la longueur de la liste", () => {
		const project = projectWith("a");
		const command = new VariablesRemoveCommand([{ ...draft("z"), index: 99 }]);

		command.cancel(project);

		expect(ids(project)).toEqual(["a", "z"]);
	});

	it("restitue le même ordre à chaque annuler/rétablir", () => {
		const project = projectWith("a", "b", "c");
		const command = new VariablesRemoveCommand([{ ...draft("b"), index: 1 }]);

		command.execute(project);
		command.cancel(project);
		command.execute(project);
		expect(ids(project)).toEqual(["a", "c"]);
		command.cancel(project);

		expect(ids(project)).toEqual(["a", "b", "c"]);
	});
});
