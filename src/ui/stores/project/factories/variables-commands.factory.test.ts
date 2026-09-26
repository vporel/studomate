import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";
import VariablesCommandsFactory from "./variables-commands.factory";

function projectWithVariable() {
	const project = new Project("p1", "Projet", "auteur");
	project.variables = [new Variable("v1", "Moteur", "logic-output", "BOOL")];
	return project;
}

describe("VariablesCommandsFactory", () => {
	describe("onAddVariable", () => {
		it("crée une commande d'ajout pour chaque variable valide, avec un id généré", () => {
			const project = new Project("p1", "Projet", "auteur");

			const { commands, variablesToAdd } =
				VariablesCommandsFactory.onAddVariable(project, [
					{ mnemonic: "Capteur", zone: "logic-input", type: "BOOL" } as any,
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
					{ mnemonic: "   ", zone: "logic-input", type: "BOOL" } as any,
				]);

			expect(commands).toHaveLength(0);
			expect(variablesToAdd).toHaveLength(0);
		});

		it("écarte un mnémonique déjà utilisé dans le projet", () => {
			const project = projectWithVariable();

			const { commands, variablesToAdd } =
				VariablesCommandsFactory.onAddVariable(project, [
					{ mnemonic: "Moteur", zone: "logic-output", type: "BOOL" } as any,
				]);

			expect(commands).toHaveLength(0);
			expect(variablesToAdd).toHaveLength(0);
		});

		it("ne crée aucune commande si toutes les variables sont écartées", () => {
			const project = new Project("p1", "Projet", "auteur");

			const { commands } = VariablesCommandsFactory.onAddVariable(project, [
				{ mnemonic: "", zone: "memory", type: "BOOL" } as any,
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
		function projectWithInput(behavior: Variable["behavior"], zone: "logic-input" | "analog-input", type: "BOOL" | "INT") {
			const project = new Project("p1", "Projet", "auteur");
			project.variables = [new Variable("v1", "e", zone, type).update({ behavior })];
			return project;
		}

		it("remet le comportement à null quand un changement de zone le rend invalide, et l'annulation le restaure", () => {
			const project = projectWithInput({ kind: "push-button-nc", params: null }, "logic-input", "BOOL");

			const { commands } = VariablesCommandsFactory.onUpdateVariable(project, "v1", {
				zone: "memory",
			});
			const [updated] = commands[0].execute(project);

			expect(updated.variables[0].zone).toBe("memory");
			expect(updated.variables[0].behavior).toBeNull();

			const restored = commands[0].cancel(updated);
			expect(restored.variables[0].zone).toBe("logic-input");
			expect(restored.variables[0].behavior).toEqual({ kind: "push-button-nc", params: null });
		});

		it("remet un curseur à null quand ses bornes sortent de la plage du nouveau type", () => {
			const project = projectWithInput({ kind: "slider", params: { min: -10, max: 10 } }, "analog-input", "INT");

			const { commands } = VariablesCommandsFactory.onUpdateVariable(project, "v1", { type: "WORD" });
			const [updated] = commands[0].execute(project);

			expect(updated.variables[0].behavior).toBeNull();
		});

		it("conserve un comportement resté valide", () => {
			const project = projectWithInput({ kind: "slider", params: { min: 0, max: 10 } }, "analog-input", "INT");

			const { commands } = VariablesCommandsFactory.onUpdateVariable(project, "v1", { type: "WORD" });
			const [updated] = commands[0].execute(project);

			expect(updated.variables[0].behavior).toEqual({ kind: "slider", params: { min: 0, max: 10 } });
		});

		it("applique un comportement explicitement fourni", () => {
			const project = projectWithInput(null, "logic-input", "BOOL");

			const { commands } = VariablesCommandsFactory.onUpdateVariable(project, "v1", {
				behavior: { kind: "toggle-switch-nc", params: null },
			});
			const [updated] = commands[0].execute(project);

			expect(updated.variables[0].behavior).toEqual({ kind: "toggle-switch-nc", params: null });
		});
	});
});

