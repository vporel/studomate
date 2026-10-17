import { Dialect } from "@/expression-language/dialect.enum";
import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";
import { variableDraft } from "@tests/utils/variable-factory";
import VariablesCommandsFactory from "./variables-commands.factory";

function projectWithVariable() {
	const project = new Project("p1", "Projet", "auteur");
	project.variables = [
		new Variable({
			id: "v1",
			mnemonic: "Moteur",
			zone: "logic-output",
			type: "BOOL",
			dialect: Dialect.FR,
		}),
	];
	return project;
}

describe("VariablesCommandsFactory", () => {
	describe("onAddVariable", () => {
		it("crée une commande d'ajout pour chaque variable valide, avec un id généré", () => {
			const project = new Project("p1", "Projet", "auteur");

			const { commands, variablesToAdd } =
				VariablesCommandsFactory.onAddVariable(project, [
					variableDraft({
						mnemonic: "Capteur",
						zone: "logic-input",
						type: "BOOL",
					}),
				]);

			expect(commands).toHaveLength(1);
			expect(variablesToAdd).toHaveLength(1);
			expect(variablesToAdd[0].id).toBeTruthy();
			expect(variablesToAdd[0].mnemonic).toBe("Capteur");
		});

		it("écarte les mnémoniques vides", () => {
			const project = new Project("p1", "Projet", "auteur");

			const { commands, variablesToAdd } =
				VariablesCommandsFactory.onAddVariable(project, [
					variableDraft({ mnemonic: "   ", zone: "logic-input", type: "BOOL" }),
				]);

			expect(commands).toHaveLength(0);
			expect(variablesToAdd).toHaveLength(0);
		});

		it("écarte un mnémonique déjà utilisé dans le projet", () => {
			const project = projectWithVariable();

			const { commands, variablesToAdd } =
				VariablesCommandsFactory.onAddVariable(project, [
					variableDraft({
						mnemonic: "Moteur",
						zone: "logic-output",
						type: "BOOL",
					}),
				]);

			expect(commands).toHaveLength(0);
			expect(variablesToAdd).toHaveLength(0);
		});

		it("ne crée aucune commande si toutes les variables sont écartées", () => {
			const project = new Project("p1", "Projet", "auteur");

			const { commands } = VariablesCommandsFactory.onAddVariable(project, [
				variableDraft({ mnemonic: "", zone: "memory", type: "BOOL" }),
			]);

			expect(commands).toHaveLength(0);
		});
	});

	describe("onUpdateVariable", () => {
		it("ne fait rien si la variable n'existe pas dans le projet", () => {
			const project = projectWithVariable();

			const { commands } = VariablesCommandsFactory.onUpdateVariable(
				project,
				"inexistante",
				{ mnemonic: "X" },
			);

			expect(commands).toHaveLength(0);
		});

		it("crée une commande de mise à jour quand la donnée change réellement", () => {
			const project = projectWithVariable();

			const { commands } = VariablesCommandsFactory.onUpdateVariable(
				project,
				"v1",
				{ mnemonic: "Autre" },
			);

			expect(commands).toHaveLength(1);
		});

		it("ne crée aucune commande si la donnée est identique à l'existante", () => {
			const project = projectWithVariable();

			const { commands } = VariablesCommandsFactory.onUpdateVariable(
				project,
				"v1",
				{ mnemonic: "Moteur" },
			);

			expect(commands).toHaveLength(0);
		});
	});

	describe("onRemoveVariable", () => {
		it("crée une commande de suppression pour les variables trouvées", () => {
			const project = projectWithVariable();

			const { commands, variablesToRemove } =
				VariablesCommandsFactory.onRemoveVariable(project, ["v1"]);

			expect(commands).toHaveLength(1);
			expect(variablesToRemove).toHaveLength(1);
			expect(variablesToRemove[0].id).toBe("v1");
		});

		it("ne crée aucune commande si aucun id ne correspond", () => {
			const project = projectWithVariable();

			const { commands, variablesToRemove } =
				VariablesCommandsFactory.onRemoveVariable(project, ["inexistante"]);

			expect(commands).toHaveLength(0);
			expect(variablesToRemove).toHaveLength(0);
		});
	});

	describe("onUpdateVariable : comportement d'entrée", () => {
		function projectWithInput(
			behavior: Variable["behavior"],
			zone: "logic-input" | "analog-input",
			type: "BOOL" | "INT",
		) {
			const project = new Project("p1", "Projet", "auteur");
			project.variables = [
				new Variable({
					id: "v1",
					mnemonic: "e",
					zone,
					type,
					dialect: Dialect.FR,
				}).update({ behavior }, Dialect.FR),
			];
			return project;
		}

		it("remet le comportement à null quand un changement de zone le rend invalide, et l'annulation le restaure", () => {
			const project = projectWithInput(
				{ kind: "push-button-nc", params: null },
				"logic-input",
				"BOOL",
			);

			const { commands } = VariablesCommandsFactory.onUpdateVariable(
				project,
				"v1",
				{
					zone: "memory",
				},
			);
			const [updated] = commands[0].execute(project);

			expect(updated.variables[0].zone).toBe("memory");
			expect(updated.variables[0].behavior).toBeNull();

			const restored = commands[0].cancel(updated);
			expect(restored.variables[0].zone).toBe("logic-input");
			expect(restored.variables[0].behavior).toEqual({
				kind: "push-button-nc",
				params: null,
			});
		});

		it("remet un curseur à null quand ses bornes sortent de la plage du nouveau type", () => {
			const project = projectWithInput(
				{ kind: "slider", params: { min: -10, max: 10 } },
				"analog-input",
				"INT",
			);

			const { commands } = VariablesCommandsFactory.onUpdateVariable(
				project,
				"v1",
				{ type: "WORD" },
			);
			const [updated] = commands[0].execute(project);

			expect(updated.variables[0].behavior).toBeNull();
		});

		it("conserve un comportement resté valide", () => {
			const project = projectWithInput(
				{ kind: "slider", params: { min: 0, max: 10 } },
				"analog-input",
				"INT",
			);

			const { commands } = VariablesCommandsFactory.onUpdateVariable(
				project,
				"v1",
				{ type: "WORD" },
			);
			const [updated] = commands[0].execute(project);

			expect(updated.variables[0].behavior).toEqual({
				kind: "slider",
				params: { min: 0, max: 10 },
			});
		});

		it("applique un comportement explicitement fourni", () => {
			const project = projectWithInput(null, "logic-input", "BOOL");

			const { commands } = VariablesCommandsFactory.onUpdateVariable(
				project,
				"v1",
				{
					behavior: { kind: "toggle-switch-nc", params: null },
				},
			);
			const [updated] = commands[0].execute(project);

			expect(updated.variables[0].behavior).toEqual({
				kind: "toggle-switch-nc",
				params: null,
			});
		});
	});
});

describe("VariablesCommandsFactory constants", () => {
	function projectWithConstant(type: "INT" | "TIME" | "BOOL", value: string) {
		const project = new Project("p1", "Projet", "auteur");
		project.variables = [
			new Variable({
				id: "k",
				mnemonic: "K",
				zone: "constant",
				type,
				value,
				dialect: Dialect.FR,
			}),
		];
		return project;
	}

	it("gives a new constant the default value of its type when none is provided", () => {
		const project = new Project("p1", "Projet", "auteur");
		project.dialect = Dialect.EN;

		const { variablesToAdd } = VariablesCommandsFactory.onAddVariable(project, [
			variableDraft({ mnemonic: "B", zone: "constant", type: "BOOL" }),
			variableDraft({ mnemonic: "T", zone: "constant", type: "TIME" }),
		]);

		expect(variablesToAdd.map((v) => v.value)).toEqual(["FALSE", "T#0s"]);
	});

	it("keeps the value provided for a new constant", () => {
		const project = new Project("p1", "Projet", "auteur");

		const { variablesToAdd } = VariablesCommandsFactory.onAddVariable(project, [
			variableDraft({
				mnemonic: "S",
				zone: "constant",
				type: "INT",
				value: "7",
			}),
		]);

		expect(variablesToAdd[0].value).toBe("7");
	});

	it("replaces the declared value by the default of the new type when it no longer fits", () => {
		const project = projectWithConstant("INT", "42");

		const { commands } = VariablesCommandsFactory.onUpdateVariable(
			project,
			"k",
			{
				type: "TIME",
			},
		);
		commands[0].execute(project);

		expect(project.variables[0]).toMatchObject({ type: "TIME", value: "T#0s" });
		commands[0].cancel(project);
		expect(project.variables[0]).toMatchObject({ type: "INT", value: "42" });
	});

	it("keeps the declared value when it still fits the new type", () => {
		const project = projectWithConstant("INT", "42");

		const { commands } = VariablesCommandsFactory.onUpdateVariable(
			project,
			"k",
			{
				type: "DINT",
			},
		);
		commands[0].execute(project);

		expect(project.variables[0]).toMatchObject({ type: "DINT", value: "42" });
	});

	it("gives a value to a variable that becomes a constant and clears its address", () => {
		const project = new Project("p1", "Projet", "auteur");
		const memory = new Variable({
			id: "m",
			mnemonic: "M",
			zone: "memory",
			type: "INT",
			dialect: Dialect.FR,
		});
		memory.address = "%MW10";
		project.variables = [memory];

		const { commands } = VariablesCommandsFactory.onUpdateVariable(
			project,
			"m",
			{
				zone: "constant",
			},
		);
		commands[0].execute(project);

		expect(project.variables[0]).toMatchObject({
			zone: "constant",
			value: "0",
			address: "",
		});
		commands[0].cancel(project);
		expect(project.variables[0]).toMatchObject({
			zone: "memory",
			address: "%MW10",
		});
	});
});
