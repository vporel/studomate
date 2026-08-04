import { Dialect } from "@/expression-language/dialect.enum";
import { ActionExecutionMode, ActionType } from "@/schemas/grafcet/action.schema";
import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import Project from "./project.schema";

function projectWithExpressions() {
	const project = new Project("p1", "Projet", "");
	project.addProgram(
		new GrafcetBuilder()
			.id("g1")
			.addTransition(new TransitionBuilder().id("t1").expression("Btn1 ET NON Btn2").build())
			.addAction(
				new ActionBuilder()
					.id("a1")
					.type(ActionType.BOOLEAN_VARIABLE)
					.executionMode(ActionExecutionMode.SET)
					.expression("Moteur")
					.build(),
			)
			.addAction(
				new ActionBuilder().id("a-text").type(ActionType.TEXT).expression("Moteur ET pompe").build(),
			)
			.build(),
	);
	return project;
}

describe("Project — dialecte des expressions", () => {
	it("est en français par défaut", () => {
		expect(new Project("p", "n", "").dialect).toBe(Dialect.FR);
	});

	it("est restitué depuis le JSON", () => {
		const project = projectWithExpressions();
		project.setDialect(Dialect.EN);

		const relu = Project.createFromJSON(JSON.stringify(project));

		expect(relu.dialect).toBe(Dialect.EN);
	});

	// Un projet écrit avant que le dialecte soit configurable était forcément en français
	it("retombe sur le français quand le JSON n'a pas de dialecte", () => {
		const relu = Project.createFromJSON(JSON.stringify({ id: "p1", name: "Ancien" }));

		expect(relu.dialect).toBe(Dialect.FR);
	});

	describe("setDialect", () => {
		it("traduit les mots-clés des transitions", () => {
			const project = projectWithExpressions();

			project.setDialect(Dialect.EN);

			expect(project.grafcets.g1.transitions[0].data.expression).toBe("Btn1 AND NOT Btn2");
		});

		it("laisse les identifiants intacts", () => {
			const project = projectWithExpressions();

			project.setDialect(Dialect.EN);

			expect(project.grafcets.g1.actions[0].data.expression).toBe("Moteur");
		});

		// Une action TEXT porte du texte descriptif, pas du code
		it("ne traduit pas le texte d'une action TEXT", () => {
			const project = projectWithExpressions();

			project.setDialect(Dialect.EN);

			const texte = project.grafcets.g1.actions.find((a) => a.id === "a-text")!;
			expect(texte.data.expression).toBe("Moteur ET pompe");
		});

		it("est réversible", () => {
			const project = projectWithExpressions();
			const avant = project.grafcets.g1.transitions[0].data.expression;

			project.setDialect(Dialect.EN);
			project.setDialect(Dialect.FR);

			expect(project.grafcets.g1.transitions[0].data.expression).toBe(avant);
		});

		it("ne fait rien si le dialecte est déjà celui demandé", () => {
			const project = projectWithExpressions();

			project.setDialect(Dialect.FR);

			expect(project.grafcets.g1.transitions[0].data.expression).toBe("Btn1 ET NON Btn2");
		});
	});
});
