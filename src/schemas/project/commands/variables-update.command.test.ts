import { ActionExecutionMode, ActionType } from "@/schemas/grafcet/action.schema";
import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import Project from "../project.schema";
import Variable from "../../variable/variable.schema";
import VariablesUpdateCommand from "./variables-update.command";

/**
 * Builds a project holding two grafcets, both referencing the variable `moteur`.
 * Neither is "open": at this level there is no such notion, which is precisely the point —
 * the rename must reach every grafcet of the project.
 */
function buildProject() {
	const project = new Project("p1", "Projet", "");
	project.variables = [new Variable("v1", "moteur", "memory", "BOOL")];

	const grafcetA = new GrafcetBuilder()
		.id("g-a")
		.addTransition(new TransitionBuilder().id("t-a").expression("moteur ET capteur").build())
		.build();

	const grafcetB = new GrafcetBuilder()
		.id("g-b")
		.addTransition(new TransitionBuilder().id("t-b").expression("NON moteur").build())
		.build();

	project.addProgram(grafcetA);
	project.addProgram(grafcetB);
	return project;
}

function renameCommand(from: string, to: string) {
	return new VariablesUpdateCommand([
		{ id: "v1", newData: { mnemonic: to }, oldData: { mnemonic: from } },
	]);
}

describe("VariablesUpdateCommand", () => {
	describe("mise à jour de la variable", () => {
		it("applique le nouveau mnémonique", () => {
			const [project] = renameCommand("moteur", "pompe").execute(buildProject());
			expect(project.variables[0].mnemonic).toBe("pompe");
		});

		it("restaure l'ancien mnémonique à l'annulation", () => {
			const command = renameCommand("moteur", "pompe");
			const [project] = command.execute(buildProject());
			const restored = command.cancel(project);
			expect(restored.variables[0].mnemonic).toBe("moteur");
		});
	});

	// Régression §2.2 : le renommage ne touchait que les grafcets dont l'onglet était ouvert
	describe("propagation aux expressions", () => {
		it("réécrit les expressions de TOUS les grafcets du projet", () => {
			const [project] = renameCommand("moteur", "pompe").execute(buildProject());

			expect(project.grafcets["g-a"].transitions[0].data.expression).toBe("pompe ET capteur");
			expect(project.grafcets["g-b"].transitions[0].data.expression).toBe("NON pompe");
		});

		it("restaure les expressions de tous les grafcets à l'annulation", () => {
			const command = renameCommand("moteur", "pompe");
			const [project] = command.execute(buildProject());
			const restored = command.cancel(project);

			expect(restored.grafcets["g-a"].transitions[0].data.expression).toBe("moteur ET capteur");
			expect(restored.grafcets["g-b"].transitions[0].data.expression).toBe("NON moteur");
		});

		it("execute puis cancel puis execute redonne le même résultat", () => {
			const command = renameCommand("moteur", "pompe");
			const [first] = command.execute(buildProject());
			const expression = first.grafcets["g-a"].transitions[0].data.expression;

			const [again] = command.execute(command.cancel(first));

			expect(again.grafcets["g-a"].transitions[0].data.expression).toBe(expression);
		});

		it("ne touche pas les expressions quand le mnémonique ne change pas", () => {
			const command = new VariablesUpdateCommand([
				{ id: "v1", newData: { comment: "un commentaire" }, oldData: { comment: "" } },
			]);
			const [project] = command.execute(buildProject());

			expect(project.grafcets["g-a"].transitions[0].data.expression).toBe("moteur ET capteur");
		});
	});

	// Une action TEXT porte du texte descriptif, pas du code : elle ne doit jamais être réécrite
	describe("actions de type TEXT", () => {
		it("ne réécrit pas le texte descriptif d'une action TEXT", () => {
			const project = buildProject();
			project.grafcets["g-a"].actions.push(
				new ActionBuilder()
					.id("a-text")
					.type(ActionType.TEXT)
					.expression("moteur en marche")
					.build(),
			);

			const [updated] = renameCommand("moteur", "pompe").execute(project);

			expect(updated.grafcets["g-a"].actions[0].data.expression).toBe("moteur en marche");
		});

		it("réécrit bien l'expression d'une action non TEXT", () => {
			const project = buildProject();
			project.grafcets["g-a"].actions.push(
				new ActionBuilder()
					.id("a-bool")
					.type(ActionType.BOOLEAN_VARIABLE)
					.executionMode(ActionExecutionMode.SET)
					.expression("moteur")
					.build(),
			);

			const [updated] = renameCommand("moteur", "pompe").execute(project);

			expect(updated.grafcets["g-a"].actions[0].data.expression).toBe("pompe");
		});
	});
});
