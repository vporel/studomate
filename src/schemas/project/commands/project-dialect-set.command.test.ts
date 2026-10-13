import { Dialect } from "@/expression-language/dialect.enum";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import Variable from "@/schemas/variable/variable.schema";
import Project from "../project.schema";
import ProjectDialectSetCommand from "./project-dialect-set.command";

function buildProject() {
	const project = new Project("p1", "Projet", "");
	project.variables = [
		new Variable("k", "K", "constant", "BOOL", undefined, "VRAI", Dialect.FR),
	];
	project.addProgram(
		new GrafcetBuilder()
			.id("g")
			.addTransition(
				new TransitionBuilder().id("t").expression("a ET b").build(),
			)
			.build(),
	);
	return project;
}

const expressionOf = (project: Project) =>
	Object.values(project.grafcets["g"].transitions)[0].data.expression;

describe("ProjectDialectSetCommand", () => {
	const command = () =>
		new ProjectDialectSetCommand({
			newDialect: Dialect.EN,
			oldDialect: Dialect.FR,
		});

	it("switches the dialect and translates expressions and constants", () => {
		const [project] = command().execute(buildProject());
		expect(project.dialect).toBe(Dialect.EN);
		expect(expressionOf(project)).toBe("a AND b");
		expect(project.variables[0].value).toBe("TRUE");
	});

	it("restores the dialect, expressions and constants on cancel", () => {
		const cmd = command();
		const [project] = cmd.execute(buildProject());
		const restored = cmd.cancel(project);
		expect(restored.dialect).toBe(Dialect.FR);
		expect(expressionOf(restored)).toBe("a ET b");
		expect(restored.variables[0].value).toBe("VRAI");
	});

	it("gives the same result when executed again after a cancel", () => {
		const cmd = command();
		const [project] = cmd.execute(buildProject());
		const [again] = cmd.execute(cmd.cancel(project));
		expect(again.dialect).toBe(Dialect.EN);
		expect(expressionOf(again)).toBe("a AND b");
	});
});
