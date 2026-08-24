import { Dialect } from "@/expression-language/dialect.enum";
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import { compilePipelineDetailed, compileToPLC, expectVariableValue } from "@tests/utils/test-helpers";
import { VariableFactory } from "@tests/utils/variable-factory";

describe("AND Junction Integration Tests", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		VariableFactory.reset();
		ProjectFactory.reset();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe("Divergence ET : pipeline compilation", () => {
		it("compiles a grafcet with AND divergence without errors", () => {
			const i0 = VariableFactory.createLogicInput("I0");
			const q0 = VariableFactory.createLogicOutput("Q0");
			const q1 = VariableFactory.createLogicOutput("Q1");

			// Step0 → [I0] → JunctionAndStart → Step1 (Q0) + Step2 (Q1) → [NON I0] → Step0
			const grafcet = GrafcetFactory.createAndDivergenceCycle("grafcet-1", "I0", "NON I0", "Q0", "Q1");
			const project = ProjectFactory.create([i0, q0, q1], [grafcet], "AND Junction Test");

			const pipeline = compilePipelineDetailed(project);

			expect(pipeline.analysis.issues).toEqual([]);
			// X0, X1, X2 step variables
			expect(pipeline.analysis.stepsVariables).toHaveLength(3);
			expect(pipeline.preCompilation.errors).toEqual([]);
			expect(pipeline.compilation.errors).toEqual([]);
			expect(pipeline.compilation.result).toBeDefined();
			// +1 pour le Main, toujours présent et scanné (voir Project.createMain).
			expect(pipeline.compilation.result!.routines).toHaveLength(2);
		});

		it("compiles without actions on branches", () => {
			const i0 = VariableFactory.createLogicInput("I0");

			const grafcet = GrafcetFactory.createAndDivergenceCycle("grafcet-1", "I0", "NON I0");
			const project = ProjectFactory.create([i0], [grafcet], "AND No Actions");

			const pipeline = compilePipelineDetailed(project);

			expect(pipeline.analysis.issues).toEqual([]);
			expect(pipeline.preCompilation.errors).toEqual([]);
			expect(pipeline.compilation.errors).toEqual([]);
		});
	});

	describe("Divergence ET : simulation PLC", () => {
		it("activates both branches simultaneously when divergence transition fires", async () => {
			const i0 = VariableFactory.createLogicInput("I0");
			const q0 = VariableFactory.createLogicOutput("Q0");
			const q1 = VariableFactory.createLogicOutput("Q1");

			// I0=TRUE  → trans-div fires → step1 AND step2 both activate (Q0 and Q1 go TRUE)
			// I0=FALSE → trans-conv = NON I0 = TRUE, but blocked until X1 AND X2 both active
			const grafcet = GrafcetFactory.createAndDivergenceCycle("grafcet-1", "I0", "NON I0", "Q0", "Q1");
			const project = ProjectFactory.create([i0, q0, q1], [grafcet], "AND Both Branches");

			let cycleError: Error | null = null;
			const plc = compileToPLC(project, 10, Dialect.FR, {
				onCycleError: (e) => {
					cycleError = e;
				},
			});
			expect(plc).not.toBeNull();

			// I0=TRUE → divergence fires, both step1 + step2 active, convergence blocked (NON I0=FALSE)
			plc!.setPhysicalInputValueByName("I0", true);
			plc!.start();
			await jest.advanceTimersByTimeAsync(300);
			if (cycleError) throw cycleError;

			// Both X1 and X2 must be active at the same time (AND semantics)
			expectVariableValue(plc!, "X0", false);
			expectVariableValue(plc!, "X1", true);
			expectVariableValue(plc!, "X2", true);
			// Both CONTINUOUS actions fire simultaneously
			expectVariableValue(plc!, "Q0", true);
			expectVariableValue(plc!, "Q1", true);

			plc!.stop();
		});

		it("converges back to step0 only when both branches are active", async () => {
			const i0 = VariableFactory.createLogicInput("I0");
			const q0 = VariableFactory.createLogicOutput("Q0");
			const q1 = VariableFactory.createLogicOutput("Q1");

			const grafcet = GrafcetFactory.createAndDivergenceCycle("grafcet-1", "I0", "NON I0", "Q0", "Q1");
			const project = ProjectFactory.create([i0, q0, q1], [grafcet], "AND Convergence");

			let cycleError: Error | null = null;
			const plc = compileToPLC(project, 10, Dialect.FR, {
				onCycleError: (e) => {
					cycleError = e;
				},
			});
			expect(plc).not.toBeNull();

			// Phase 1: I0=TRUE → both branches active
			plc!.setPhysicalInputValueByName("I0", true);
			plc!.start();
			await jest.advanceTimersByTimeAsync(200);
			if (cycleError) throw cycleError;
			expectVariableValue(plc!, "X1", true);
			expectVariableValue(plc!, "X2", true);

			// Phase 2: I0=FALSE → trans-conv = NON I0 = TRUE, X1 AND X2 both active → convergence fires
			plc!.setPhysicalInputValueByName("I0", false);
			await jest.advanceTimersByTimeAsync(200);
			if (cycleError) throw cycleError;

			// Step0 re-activates, both branches deactivate (CONTINUOUS cleanup)
			expectVariableValue(plc!, "X0", true);
			expectVariableValue(plc!, "X1", false);
			expectVariableValue(plc!, "X2", false);
			expectVariableValue(plc!, "Q0", false);
			expectVariableValue(plc!, "Q1", false);

			plc!.stop();
		});

		it("step0 stays active while divergence condition is false", async () => {
			const i0 = VariableFactory.createLogicInput("I0");
			const q0 = VariableFactory.createLogicOutput("Q0");
			const q1 = VariableFactory.createLogicOutput("Q1");

			const grafcet = GrafcetFactory.createAndDivergenceCycle("grafcet-1", "I0", "NON I0", "Q0", "Q1");
			const project = ProjectFactory.create([i0, q0, q1], [grafcet], "AND Stable Step0");

			let cycleError: Error | null = null;
			const plc = compileToPLC(project, 10, Dialect.FR, {
				onCycleError: (e) => {
					cycleError = e;
				},
			});
			expect(plc).not.toBeNull();

			// I0=FALSE: trans-div = FALSE → step0 stays active, branches never activate
			plc!.setPhysicalInputValueByName("I0", false);
			plc!.start();
			await jest.advanceTimersByTimeAsync(300);
			if (cycleError) throw cycleError;

			expectVariableValue(plc!, "X0", true);
			expectVariableValue(plc!, "X1", false);
			expectVariableValue(plc!, "X2", false);
			expectVariableValue(plc!, "Q0", false);
			expectVariableValue(plc!, "Q1", false);

			plc!.stop();
		});
	});

	describe("Différence ET vs OU : comportement distinct", () => {
		it("ET active les DEUX branches (contrairement à OU qui en active une seule)", async () => {
			const i0 = VariableFactory.createLogicInput("I0");
			const q0 = VariableFactory.createLogicOutput("Q0");
			const q1 = VariableFactory.createLogicOutput("Q1");

			// AND grafcet: I0=TRUE → BOTH Q0 and Q1 become TRUE
			const andGrafcet = GrafcetFactory.createAndDivergenceCycle(
				"grafcet-and",
				"I0",
				"NON I0",
				"Q0",
				"Q1",
			);
			const project = ProjectFactory.create([i0, q0, q1], [andGrafcet], "AND vs OR");

			let cycleError: Error | null = null;
			const plc = compileToPLC(project, 10, Dialect.FR, {
				onCycleError: (e) => {
					cycleError = e;
				},
			});
			expect(plc).not.toBeNull();

			plc!.setPhysicalInputValueByName("I0", true);
			plc!.start();
			await jest.advanceTimersByTimeAsync(300);
			plc!.stop();
			if (cycleError) throw cycleError;

			// In AND: both outputs must be true simultaneously — key AND property
			// (In OR with I0=TRUE, only Q0 would be true, Q1 false)
			expectVariableValue(plc!, "X1", true);
			expectVariableValue(plc!, "X2", true); // Would be false in OR
		});
	});
});
