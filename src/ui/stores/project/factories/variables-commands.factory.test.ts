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
});
