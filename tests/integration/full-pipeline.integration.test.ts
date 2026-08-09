import { ActionExecutionMode } from "@/schemas/grafcet/action.schema";
import { Dialect } from "@/expression-language/dialect.enum";
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import { compilePipelineDetailed, compileToPLC, expectVariableValue } from "@tests/utils/test-helpers";
import { VariableFactory } from "@tests/utils/variable-factory";

describe("Full Pipeline Integration Test", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		// Reset factories before each test
		VariableFactory.reset();
		ProjectFactory.reset();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe("Complete workflow: Analysis → Pre-compilation → Compilation → Simulation", () => {
		it("processes a simple project with one grafcet and executes it in PLC", async () => {
			// 1. CREATE PROJECT using factories
			const inputVar = VariableFactory.createLogicInput("I0");
			const outputVar = VariableFactory.createLogicOutput("Q0");
			const memoryVar = VariableFactory.createMemoryBool("M0");

			const grafcet = GrafcetFactory.createCycleWithBooleanActions(
				"grafcet-1",
				"Q0", // Action on step 0: SET Q0 (Q0 := TRUE)
				"Q0", // Action on step 1: RESET Q0 (Q0 := FALSE)
				"I0", // Transition condition from step 0 to 1
				"NON I0", // Transition condition from step 1 to 0
			);

			const project = ProjectFactory.create(
				[inputVar, outputVar, memoryVar],
				[grafcet],
				"Test Project",
			);

			// 2. COMPILE (includes Analysis, Pre-compilation, Compilation)
			const pipeline = compilePipelineDetailed(project);

			expect(pipeline.analysis.issues).toEqual([]);
			expect(pipeline.analysis.stepsVariables).toHaveLength(2); // X0, X1
			expect(pipeline.preCompilation.errors).toEqual([]);
			expect(pipeline.compilation.errors).toEqual([]);
			expect(pipeline.compilation.result).toBeDefined();
			expect(pipeline.compilation.result!.routines).toHaveLength(1);

			// 3. CREATE PLC AND SIMULATE
			let cycleError: Error | null = null;
			const plc = compileToPLC(project, 10, Dialect.FR, {
				onCycleError: (e) => {
					cycleError = e;
				},
			});
			expect(plc).not.toBeNull();

			// Initial state
			expectVariableValue(plc!, "X0", false);
			expectVariableValue(plc!, "X1", false);
			expectVariableValue(plc!, "Q0", false);

			// Run many cycles (10ms scan × 50 cycles minimum in 600ms)
			plc!.start();
			await jest.advanceTimersByTimeAsync(600);
			plc!.stop();
			if (cycleError) throw cycleError;

			// After two cycles, step 0 should be active and SET action fired
			expectVariableValue(plc!, "X0", true);
			expectVariableValue(plc!, "X1", false);
			expectVariableValue(plc!, "Q0", true); // Output ON (SET action on step 0 fired on rising edge)
		});

		it("handles state transitions when input changes", async () => {
			// Create project using factories
			const inputVar = VariableFactory.createLogicInput("I0");
			const outputVar = VariableFactory.createLogicOutput("Q0");

			// Grafcet:
			//  Step 0 (no action) → [T0: I0] → Step 1 (CONTINUOUS Q0) → [T1: NON I0] → Step 0
			// Step 1 stays active while I0=true; Q0=true while step 1 active; Q0=false when step 0 active
			const grafcet = GrafcetFactory.createCycleWithBooleanActions(
				"grafcet-1",
				"", // No action on step 0
				"Q0", // Action on step 1: CONTINUOUS Q0 (true while step 1 is active)
				"I0", // Transition from step 0 to 1 when I0 is true
				"NON I0", // Transition from step 1 to 0 when I0 is false
				ActionExecutionMode.SET, // step 0: no action (variable is empty, mode is irrelevant)
				ActionExecutionMode.CONTINUOUS, // step 1: CONTINUOUS so Q0 resets when step deactivates
			);

			const project = ProjectFactory.create([inputVar, outputVar], [grafcet]);

			// Compile, create PLC with 10ms scan (fast cycles to avoid timer precision issues)
			let cycleError: Error | null = null;
			const plc = compileToPLC(project, 10, Dialect.FR, {
				onCycleError: (e) => {
					cycleError = e;
				},
			});
			expect(plc).not.toBeNull();

			// Set input to FALSE initially — step 0 is stable, no transition
			plc!.setPhysicalInputValueByName("I0", false);
			plc!.start();

			// After many cycles, step 0 should be active, Q0=false
			await jest.advanceTimersByTimeAsync(300);
			if (cycleError) throw cycleError;
			expectVariableValue(plc!, "X0", true);
			expectVariableValue(plc!, "X1", false);
			expectVariableValue(plc!, "Q0", false);

			// Set input to TRUE — T0 fires (step 0 → step 1), T1=NON I0=false so step 1 stays active
			plc!.setPhysicalInputValueByName("I0", true);

			// After many cycles, step 1 should be active and CONTINUOUS action fires Q0=true
			await jest.advanceTimersByTimeAsync(300);
			if (cycleError) throw cycleError;
			expectVariableValue(plc!, "X0", false);
			expectVariableValue(plc!, "X1", true);
			expectVariableValue(plc!, "Q0", true);

			// Set input back to FALSE — T1=NON I0=true fires (step 1 → step 0), Q0 resets
			plc!.setPhysicalInputValueByName("I0", false);

			// After many cycles, step 0 active again, Q0=false (CONTINUOUS falling edge fired)
			await jest.advanceTimersByTimeAsync(300);
			if (cycleError) throw cycleError;
			expectVariableValue(plc!, "X0", true);
			expectVariableValue(plc!, "X1", false);
			expectVariableValue(plc!, "Q0", false);

			plc!.stop();
		});

		it("detects compilation errors in invalid expressions", () => {
			// Create a project with an invalid expression
			const grafcet = GrafcetFactory.createSimpleCycle("grafcet-1", "UNDEFINED_VARIABLE", "VRAI");
			const project = ProjectFactory.createWithGrafcets([grafcet], "Error Test");

			// Verify pipeline detects the error
			const pipeline = compilePipelineDetailed(project);

			// Analysis should catch the undefined variable
			expect(pipeline.analysis.issues.length).toBeGreaterThan(0);
			const undefinedVarIssue = pipeline.analysis.issues.find((i) =>
				i.message.includes("UNDEFINED_VARIABLE"),
			);
			expect(undefinedVarIssue).toBeDefined();
			expect(undefinedVarIssue?.severity).toBe("error");
		});

		it("handles multiple grafcets in one project", () => {
			// Create shared variable
			const sharedVar = VariableFactory.createMemoryBool("M0");

			// Create two grafcets
			const grafcet1 = GrafcetFactory.createCycleWithBooleanActions(
				"grafcet-1",
				"M0", // SET M0 on step 0
				"M0", // RESET M0 on step 1
				"VRAI", // Always transition
				"VRAI", // Always transition
			);

			const grafcet2 = GrafcetFactory.createSimpleCycle(
				"grafcet-2",
				"M0", // Transition when M0 is TRUE (depends on grafcet 1)
				"VRAI", // Always return
				10, // Start numbering at 10
			);

			const project = ProjectFactory.create([sharedVar], [grafcet1, grafcet2], "Multi Grafcet");

			// Verify full pipeline
			const pipeline = compilePipelineDetailed(project);

			expect(pipeline.analysis.issues).toEqual([]);
			expect(pipeline.analysis.stepsVariables).toHaveLength(4); // X0, X1, X10, X11
			expect(pipeline.preCompilation.errors).toEqual([]);
			expect(Object.keys(pipeline.preCompilation.result!.programs)).toHaveLength(2);
			expect(pipeline.compilation.errors).toEqual([]);
			expect(pipeline.compilation.result!.routines).toHaveLength(2); // One routine per grafcet

			// Variables should include: M0, X0, X1, X10, X11, and memos
			expect(pipeline.compilation.result!.variables.length).toBeGreaterThanOrEqual(5);
		});
	});
});
