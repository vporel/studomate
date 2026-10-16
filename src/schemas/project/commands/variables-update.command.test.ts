import { Dialect } from "@/expression-language/dialect.enum";
import {
	ActionExecutionMode,
	ActionType,
} from "@/schemas/grafcet/action.schema";
import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import { createContactElement } from "@/schemas/ladder/element.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Section from "@/schemas/ladder/section.schema";
import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import Project from "../project.schema";
import Variable from "@/schemas/variable/variable.schema";
import VariablesUpdateCommand from "./variables-update.command";

/**
 * Builds a project holding two grafcets and a ladder, all referencing the variable `moteur`.
 * Neither is "open": at this level there is no such notion, which is precisely the point —
 * the rename must reach every program of the project.
 */
function buildProject() {
	const project = new Project("p1", "Projet", "");
	project.variables = [
		new Variable({
			id: "v1",
			mnemonic: "moteur",
			zone: "memory",
			type: "BOOL",
			dialect: Dialect.FR,
		}),
	];

	const grafcetA = new GrafcetBuilder()
		.id("g-a")
		.addTransition(
			new TransitionBuilder().id("t-a").expression("moteur ET capteur").build(),
		)
		.build();

	const grafcetB = new GrafcetBuilder()
		.id("g-b")
		.addTransition(
			new TransitionBuilder().id("t-b").expression("NON moteur").build(),
		)
		.build();

	const contact = createContactElement("moteur", "NO", 0, 0);
	const section = new Section("s1", "Section", "", [contact]);
	const ladder = new Ladder("l-a", "Ladder", [section]);

	project.addProgram(grafcetA);
	project.addProgram(grafcetB);
	project.addProgram(ladder);
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
			const [project] = renameCommand("moteur", "pompe").execute(
				buildProject(),
			);
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
			const [project] = renameCommand("moteur", "pompe").execute(
				buildProject(),
			);

			expect(
				Object.values(project.grafcets["g-a"].transitions)[0].data.expression,
			).toBe("pompe ET capteur");
			expect(
				Object.values(project.grafcets["g-b"].transitions)[0].data.expression,
			).toBe("NON pompe");
		});

		it("restaure les expressions de tous les grafcets à l'annulation", () => {
			const command = renameCommand("moteur", "pompe");
			const [project] = command.execute(buildProject());
			const restored = command.cancel(project);

			expect(
				Object.values(restored.grafcets["g-a"].transitions)[0].data.expression,
			).toBe("moteur ET capteur");
			expect(
				Object.values(restored.grafcets["g-b"].transitions)[0].data.expression,
			).toBe("NON moteur");
		});

		it("execute puis cancel puis execute redonne le même résultat", () => {
			const command = renameCommand("moteur", "pompe");
			const [first] = command.execute(buildProject());
			const expression = Object.values(first.grafcets["g-a"].transitions)[0]
				.data.expression;

			const [again] = command.execute(command.cancel(first));

			expect(
				Object.values(again.grafcets["g-a"].transitions)[0].data.expression,
			).toBe(expression);
		});

		it("ne touche pas les expressions quand le mnémonique ne change pas", () => {
			const command = new VariablesUpdateCommand([
				{
					id: "v1",
					newData: { comment: "un commentaire" },
					oldData: { comment: "" },
				},
			]);
			const [project] = command.execute(buildProject());

			expect(
				Object.values(project.grafcets["g-a"].transitions)[0].data.expression,
			).toBe("moteur ET capteur");
		});
	});

	// Régression : ContactData/CoilData référencent la variable par mnémonique en texte, tout
	// comme les expressions GRAFCET — le renommage doit les atteindre aussi.
	describe("propagation aux contacts/bobines des ladders", () => {
		it("réécrit la référence des contacts/bobines de TOUS les ladders du projet", () => {
			const [project] = renameCommand("moteur", "pompe").execute(
				buildProject(),
			);

			const [contact] = project.ladders["l-a"].sections[0].elements;
			expect(contact.data).toEqual(
				expect.objectContaining({ variable: "pompe" }),
			);
		});

		it("restaure la référence des contacts/bobines à l'annulation", () => {
			const command = renameCommand("moteur", "pompe");
			const [project] = command.execute(buildProject());
			const restored = command.cancel(project);

			const [contact] = restored.ladders["l-a"].sections[0].elements;
			expect(contact.data).toEqual(
				expect.objectContaining({ variable: "moteur" }),
			);
		});
	});

	// Une action TEXT porte du texte descriptif, pas du code : elle ne doit jamais être réécrite
	describe("actions de type TEXT", () => {
		it("ne réécrit pas le texte descriptif d'une action TEXT", () => {
			const project = buildProject();
			const textAction = new ActionBuilder()
				.id("a-text")
				.type(ActionType.TEXT)
				.expression("moteur en marche")
				.build();
			project.grafcets["g-a"].actions[textAction.id] = textAction;

			const [updated] = renameCommand("moteur", "pompe").execute(project);

			expect(
				Object.values(updated.grafcets["g-a"].actions)[0].data.expression,
			).toBe("moteur en marche");
		});

		it("réécrit bien l'expression d'une action non TEXT", () => {
			const project = buildProject();
			const boolAction = new ActionBuilder()
				.id("a-bool")
				.type(ActionType.BOOLEAN_VARIABLE)
				.executionMode(ActionExecutionMode.SET)
				.expression("moteur")
				.build();
			project.grafcets["g-a"].actions[boolAction.id] = boolAction;

			const [updated] = renameCommand("moteur", "pompe").execute(project);

			expect(
				Object.values(updated.grafcets["g-a"].actions)[0].data.expression,
			).toBe("pompe");
		});
	});
});

describe("VariablesUpdateCommand constants", () => {
	function projectWithConstant(dialect = Dialect.FR, value = "FAUX") {
		const project = new Project("p1", "Projet", "");
		project.dialect = dialect;
		project.variables = [
			new Variable({
				id: "k",
				mnemonic: "K",
				zone: "constant",
				type: "BOOL",
				value,
				dialect,
			}),
		];
		return project;
	}

	it("updates the value and cancel restores the previous one", () => {
		const project = projectWithConstant();
		const command = new VariablesUpdateCommand([
			{ id: "k", newData: { value: "VRAI" }, oldData: { value: "FAUX" } },
		]);

		command.execute(project);
		expect(project.variables[0].value).toBe("VRAI");
		command.cancel(project);

		expect(project.variables[0].value).toBe("FAUX");
	});

	it("replays with the dialect of the project", () => {
		const project = projectWithConstant(Dialect.EN, "FALSE");
		const command = new VariablesUpdateCommand([
			{ id: "k", newData: { value: "TRUE" }, oldData: { value: "FALSE" } },
		]);

		command.execute(project);

		expect(project.variables[0].value).toBe("TRUE");
	});

	it("refuses a value written in the other dialect", () => {
		const project = projectWithConstant(Dialect.EN, "FALSE");
		const command = new VariablesUpdateCommand([
			{ id: "k", newData: { value: "VRAI" }, oldData: { value: "FALSE" } },
		]);

		expect(() => command.execute(project)).toThrow("CONSTANT_VALUE_INVALID");
	});
});

describe("VariablesUpdateCommand: HMI widgets", () => {
	function projectWithHmi() {
		const project = buildProject();
		const page = project.createHmiPage("Page");
		const button = HmiWidget.create("push-button", 0, 0);
		if (button.type !== "push-button") throw new Error("unreachable");
		button.data.variable = "moteur";
		button.data.animations = { position: { xVariable: "moteur" } };
		page.addWidget(button);
		return { project, page, button };
	}

	it("rewrites the widgets bindings on execute", () => {
		const { project, page, button } = projectWithHmi();
		renameCommand("moteur", "pompe").execute(project);
		const widget = project.getHmiPage(page.id)!.widgets[button.id];
		expect(widget.data).toMatchObject({
			variable: "pompe",
			animations: { position: { xVariable: "pompe" } },
		});
	});

	it("restores the widgets bindings on cancel", () => {
		const { project, page, button } = projectWithHmi();
		const command = renameCommand("moteur", "pompe");
		command.execute(project);
		command.cancel(project);
		const widget = project.getHmiPage(page.id)!.widgets[button.id];
		expect(widget.data).toMatchObject({
			variable: "moteur",
			animations: { position: { xVariable: "moteur" } },
		});
	});

	it("leaves a project without HMI pages unaffected", () => {
		const [project] = renameCommand("moteur", "pompe").execute(buildProject());
		expect(project.hmiPages).toEqual({});
	});
});
