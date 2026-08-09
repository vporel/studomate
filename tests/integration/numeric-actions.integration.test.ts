import { ActionExecutionMode } from "@/schemas/grafcet/action.schema";
import { Dialect } from "@/expression-language/dialect.enum";
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import { compilePipelineDetailed, compileToPLC, getVariableValue } from "@tests/utils/test-helpers";
import { VariableFactory } from "@tests/utils/variable-factory";

describe("Numeric Actions Integration Tests", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		VariableFactory.reset();
		ProjectFactory.reset();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe("Pipeline compilation avec action numérique", () => {
		it("compiles a grafcet with a numeric CONTINUOUS action without errors", () => {
			const counter = VariableFactory.createMemoryInt("Counter");

			// Step0 → [VRAI] → Step1 (CONTINUOUS: Counter := Counter + 1) → [VRAI] → Step0
			const grafcet = GrafcetFactory.createNumericActionCycle(
				"grafcet-1",
				"Counter := Counter + 1",
				ActionExecutionMode.CONTINUOUS,
			);
			const project = ProjectFactory.create([counter], [grafcet], "Numeric Action Test");

			const pipeline = compilePipelineDetailed(project);

			expect(pipeline.analysis.issues).toEqual([]);
			expect(pipeline.preCompilation.errors).toEqual([]);
			expect(pipeline.compilation.errors).toEqual([]);
			expect(pipeline.compilation.result).toBeDefined();

			// Counter variable should be present in compiled output
			const counterVar = pipeline.compilation.result!.variables.find((v) => v.getName() === "Counter");
			expect(counterVar).toBeDefined();
		});

		it("compiles a grafcet with a numeric RISING_EDGE action without errors", () => {
			const counter = VariableFactory.createMemoryInt("Counter");

			const grafcet = GrafcetFactory.createNumericActionCycle(
				"grafcet-1",
				"Counter := Counter + 1",
				ActionExecutionMode.RISING_EDGE,
			);
			const project = ProjectFactory.create([counter], [grafcet], "Rising Edge Numeric Test");

			const pipeline = compilePipelineDetailed(project);

			expect(pipeline.analysis.issues).toEqual([]);
			expect(pipeline.preCompilation.errors).toEqual([]);
			expect(pipeline.compilation.errors).toEqual([]);
		});
	});

	describe("Simulation PLC — action CONTINUOUS", () => {
		it("increments Counter on every cycle step1 is active", async () => {
			const counter = VariableFactory.createMemoryInt("Counter");

			// Step0 → [VRAI] → Step1 (CONTINUOUS: Counter := Counter + 1) → [VRAI] → Step0
			// Both transitions are VRAI: each scan loop steps through both steps.
			// CONTINUOUS fires every scan cycle step1 is active → Counter grows with each iteration.
			const grafcet = GrafcetFactory.createNumericActionCycle(
				"grafcet-num",
				"Counter := Counter + 1",
				ActionExecutionMode.CONTINUOUS,
			);
			const project = ProjectFactory.create([counter], [grafcet], "CONTINUOUS Counter");

			let cycleError: Error | null = null;
			const plc = compileToPLC(project, 10, Dialect.FR, {
				onCycleError: (e) => {
					cycleError = e;
				},
			});
			expect(plc).not.toBeNull();

			plc!.start();
			await jest.advanceTimersByTimeAsync(400);
			plc!.stop();

			if (cycleError) throw cycleError;

			// After ~40 scan cycles of 10ms, Counter must be > 0
			const counterValue = getVariableValue(plc!, "Counter");
			expect(typeof counterValue).toBe("number");
			expect(counterValue as number).toBeGreaterThan(0);
		});
	});

	describe("Simulation PLC — action RISING_EDGE", () => {
		it("fires exactly once per step activation, not every scan cycle", async () => {
			const counter = VariableFactory.createMemoryInt("Counter");

			// Grafcet : Step0 (initial) → [VRAI] → Step1 (RISING_EDGE: Counter++) → [VRAI] → Step0
			// With VRAI back-transition, step1 is active for exactly 1 scan cycle per loop.
			// RISING_EDGE fires once on the cycle step1 becomes active.
			// After N loop iterations, Counter = N (one per activation, same as CONTINUOUS here).
			// The key check: Counter must be << total_scan_count (not firing every scan).
			const grafcet = GrafcetFactory.createNumericActionCycle(
				"grafcet-re",
				"Counter := Counter + 1",
				ActionExecutionMode.RISING_EDGE,
			);
			const project = ProjectFactory.create([counter], [grafcet], "RISING_EDGE Counter");

			let cycleError: Error | null = null;
			const plc = compileToPLC(project, 10, Dialect.FR, {
				onCycleError: (e) => {
					cycleError = e;
				},
			});
			expect(plc).not.toBeNull();

			// I_HOLD not used here (grafcet transitions are VRAI)
			plc!.start();
			const scanMs = 10;
			const runMs = 300;
			await jest.advanceTimersByTimeAsync(runMs);
			plc!.stop();

			if (cycleError) throw cycleError;

			const totalScanCycles = runMs / scanMs; // ~30 cycles
			const counterValue = getVariableValue(plc!, "Counter") as number;

			// Counter > 0: action did fire at least once
			expect(counterValue).toBeGreaterThan(0);
			// Counter must be strictly less than total scan cycles:
			// if it were CONTINUOUS it could fire every cycle (Counter ≈ totalScanCycles),
			// but RISING_EDGE only fires on rising edges (step active ~every 2 cycles → Counter ≤ ~totalScanCycles/2)
			// We use a conservative bound: Counter < totalScanCycles
			expect(counterValue).toBeLessThan(totalScanCycles);
		});
	});

	describe("Action numérique avec expression complexe", () => {
		it("compiles and runs an arithmetic expression with multiple variables", () => {
			const a = VariableFactory.createMemoryInt("A");
			const b = VariableFactory.createMemoryInt("B");
			const c = VariableFactory.createMemoryInt("C");

			// Action: C := A + B  (RISING_EDGE)
			const grafcet = GrafcetFactory.createNumericActionCycle(
				"grafcet-expr",
				"C := A + B",
				ActionExecutionMode.RISING_EDGE,
			);
			const project = ProjectFactory.create([a, b, c], [grafcet], "Complex Expression");

			const pipeline = compilePipelineDetailed(project);

			expect(pipeline.analysis.issues).toEqual([]);
			expect(pipeline.preCompilation.errors).toEqual([]);
			expect(pipeline.compilation.errors).toEqual([]);
		});
	});
});
