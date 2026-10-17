import CrossReferenceCollector from "@/project-analyser/cross-reference/cross-reference-collector";
import ProjectAnalyser from "@/project-analyser/project.analyser";
import { Dialect } from "@/expression-language/dialect.enum";
import { ActionExecutionMode } from "@/schemas/grafcet/action.schema";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import {
	compilePipelineDetailed,
	compileToPLC,
	getVariableValue,
} from "@tests/utils/test-helpers";
import { VariableFactory } from "@tests/utils/variable-factory";

describe("Constantes: pipeline", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		VariableFactory.reset();
		ProjectFactory.reset();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	const seuil = () =>
		new VariableBuilder()
			.id("k-seuil")
			.mnemonic("SEUIL")
			.zone("constant")
			.type("INT")
			.value("40")
			.build();

	it("a routine reads the declared value of a constant in simulation", async () => {
		const total = VariableFactory.createMemoryInt("Total");
		const grafcet = GrafcetFactory.createNumericActionCycle(
			"g1",
			"Total := SEUIL + 2",
			ActionExecutionMode.CONTINUOUS,
		);
		const project = ProjectFactory.create([seuil(), total], [grafcet], "Const");

		const plc = compileToPLC(project, 10);
		expect(plc).not.toBeNull();
		plc!.start();
		await jest.advanceTimersByTimeAsync(200);
		plc!.stop();

		expect(getVariableValue(plc!, "Total")).toBe(42);
		expect(getVariableValue(plc!, "SEUIL")).toBe(40);
	});

	it("a TIME constant and a boolean constant of the EN dialect compile and hold their value", async () => {
		const delai = new VariableBuilder()
			.id("k-delai")
			.mnemonic("DELAI")
			.zone("constant")
			.type("TIME")
			.value("T#5s")
			.build();
		const actif = new VariableBuilder()
			.id("k-actif")
			.mnemonic("ACTIF")
			.zone("constant")
			.type("BOOL")
			.value("TRUE")
			.dialect(Dialect.EN)
			.build();
		const project = ProjectFactory.create([delai, actif], [], "Const EN");
		project.dialect = Dialect.EN;

		const pipeline = compilePipelineDetailed(project, Dialect.EN);
		const values = Object.fromEntries(
			pipeline.compilation.result!.variables.map((v) => [
				v.getName(),
				v.getValue(),
			]),
		);

		expect(pipeline.analysis.issues).toEqual([]);
		expect(values).toMatchObject({ DELAI: 5000, ACTIF: true });
	});

	it("an action assigning a constant is reported by the analysis", () => {
		const grafcet = GrafcetFactory.createNumericActionCycle(
			"g1",
			"SEUIL := 3",
			ActionExecutionMode.CONTINUOUS,
		);
		const project = ProjectFactory.create([seuil()], [grafcet], "Const");

		const pipeline = compilePipelineDetailed(project);

		expect(pipeline.analysis.issues.length).toBeGreaterThan(0);
	});

	it("a constant whose declared value was corrupted is reported by the analysis", () => {
		const corrupted = seuil();
		corrupted.value = "99999";
		const project = ProjectFactory.create([corrupted], [], "Const");

		const issues = ProjectAnalyser.analyse(project).issues;

		expect(issues.map((i) => i.code)).toContain("PROJECT_CONSTANT_INVALID");
	});

	it("a constant carrying an address is reported by the analysis", () => {
		const withAddress = seuil();
		withAddress.address = "%MW10";
		const project = ProjectFactory.create([withAddress], [], "Const");

		expect(
			ProjectAnalyser.analyse(project).issues.map((i) => i.code),
		).toContain("PROJECT_CONSTANT_INVALID");
	});

	it("a valid constant raises no analysis issue", () => {
		const project = ProjectFactory.create([seuil()], [], "Const");

		expect(ProjectAnalyser.analyse(project).issues).toEqual([]);
	});

	it("the PLC refuses to write or force a constant", () => {
		const project = ProjectFactory.create(
			[seuil(), VariableFactory.createMemoryInt("Total")],
			[
				GrafcetFactory.createNumericActionCycle(
					"g1",
					"Total := SEUIL",
					ActionExecutionMode.CONTINUOUS,
				),
			],
			"Const",
		);
		const compiled = compilePipelineDetailed(project).compilation.result;
		const plc = compileToPLC(project, 10);

		const id = compiled
			? compiled.variables.find((v) => v.getName() === "SEUIL")!.getId()
			: "k-seuil";

		expect(() => plc!.setMemoryValueById(id, 1)).toThrow("is a constant");
		expect(() => plc!.forceVariable(id, 1)).toThrow("is a constant");
	});

	it("never counts a constant among the writes of the cross-references", () => {
		const total = VariableFactory.createMemoryInt("Total");
		const grafcet = GrafcetFactory.createNumericActionCycle(
			"g1",
			"Total := SEUIL",
			ActionExecutionMode.CONTINUOUS,
		);
		const project = ProjectFactory.create([seuil(), total], [grafcet], "Const");

		const crossRefs = CrossReferenceCollector.collect(project);
		const seuilRefs = crossRefs.find((c) => c.variableName === "SEUIL")!;

		expect(seuilRefs.references.map((r) => r.access)).toEqual(["read"]);
	});
});
