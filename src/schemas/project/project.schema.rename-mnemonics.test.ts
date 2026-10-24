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
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import Project from "./project.schema";

function buildProject() {
	const project = new Project("p1", "Projet", "");
	project.variables.push(
		VariableBuilder.buildLogicInput("v1", "marche"),
		VariableBuilder.buildLogicInput("v2", "arret"),
		VariableBuilder.buildLogicOutput("v3", "pompe"),
	);
	project.addProgram(
		new GrafcetBuilder()
			.id("g1")
			.addTransition(
				new TransitionBuilder()
					.id("t1")
					.expression("marche ET NON arret")
					.build(),
			)
			.addAction(
				new ActionBuilder()
					.id("a1")
					.type(ActionType.BOOLEAN_VARIABLE)
					.executionMode(ActionExecutionMode.SET)
					.expression("pompe")
					.build(),
			)
			.build(),
	);
	const ladder = new Ladder("l1", "Ladder");
	ladder.addElements(ladder.sections[0].id, [
		createContactElement("marche", "NO", 0, 0),
	]);
	project.addProgram(ladder);
	return project;
}

function ladderContactVariable(project: Project): string {
	const element = project.ladders["l1"].getAllElements()[0];
	return (element.data as { variable: string }).variable;
}

describe("Project.renameMnemonics", () => {
	it("renomme les variables et leurs références dans les grafcets et les ladders", () => {
		const project = buildProject();

		project.renameMnemonics({ marche: "start", pompe: "pump" });

		expect(project.variables.map((v) => v.mnemonic)).toEqual([
			"start",
			"arret",
			"pump",
		]);
		const grafcet = project.grafcets["g1"];
		expect(grafcet.transitions["t1"].data.expression).toBe("start ET NON arret");
		expect(grafcet.actions["a1"].data.expression).toBe("pump");
		expect(ladderContactVariable(project)).toBe("start");
	});

	it("applique les renommages simultanément (échange de deux noms, pas de cascade)", () => {
		const project = buildProject();

		project.renameMnemonics({ marche: "arret", arret: "marche" });

		expect(project.variables.map((v) => v.mnemonic)).toEqual([
			"arret",
			"marche",
			"pompe",
		]);
		expect(project.grafcets["g1"].transitions["t1"].data.expression).toBe(
			"arret ET NON marche",
		);
		expect(ladderContactVariable(project)).toBe("arret");
	});

	it("ignore les mnémoniques absents du projet", () => {
		const project = buildProject();

		project.renameMnemonics({ absent: "other" });

		expect(project.variables.map((v) => v.mnemonic)).toEqual([
			"marche",
			"arret",
			"pompe",
		]);
	});

	it("refuse un renommage qui dupliquerait un mnémonique et laisse le projet intact", () => {
		const project = buildProject();

		expect(() => project.renameMnemonics({ marche: "pompe" })).toThrow(
			/duplicate/,
		);

		expect(project.variables.map((v) => v.mnemonic)).toEqual([
			"marche",
			"arret",
			"pompe",
		]);
		expect(project.grafcets["g1"].transitions["t1"].data.expression).toBe(
			"marche ET NON arret",
		);
	});

	it("utilise le dialecte du projet pour réécrire les expressions", () => {
		const project = buildProject();
		project.setDialect(Dialect.EN);

		project.renameMnemonics({ marche: "start" });

		expect(project.grafcets["g1"].transitions["t1"].data.expression).toBe(
			"start AND NOT arret",
		);
	});
});
