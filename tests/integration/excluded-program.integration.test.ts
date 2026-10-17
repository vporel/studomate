import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import { compilePipelineDetailed } from "@tests/utils/test-helpers";
import { VariableFactory } from "@tests/utils/variable-factory";

describe("Program excluded from execution (pipeline)", () => {
	beforeEach(() => {
		VariableFactory.reset();
		ProjectFactory.reset();
	});

	it("compiles the project without any routine for the excluded program", () => {
		const i0 = VariableFactory.createLogicInput("I0");
		const executed = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0", 0);
		// Same step numbers and free text: would conflict/fail if it were executed.
		const excluded = GrafcetFactory.createSimpleCycle(
			"g2",
			"départ cycle",
			"fin (",
			0,
		);
		excluded.excludedFromExecution = true;
		const project = ProjectFactory.create([i0], [executed, excluded]);

		const pipeline = compilePipelineDetailed(project);

		expect(pipeline.analysis.issues).toEqual([]);
		expect(pipeline.preCompilation.errors).toEqual([]);
		expect(pipeline.compilation.errors).toEqual([]);
		const compiled = pipeline.compilation.result!;
		expect(compiled.routinesById).toHaveProperty("g1");
		expect(compiled.routinesById).not.toHaveProperty("g2");
	});
});
