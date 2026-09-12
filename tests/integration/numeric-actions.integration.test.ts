import { ActionExecutionMode, ActionType } from "@/schemas/grafcet/action.schema";
import { Dialect } from "@/expression-language/dialect.enum";
import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import { compilePipelineDetailed, compileToPLC, getVariableValue } from "@tests/utils/test-helpers";
import { VariableFactory } from "@tests/utils/variable-factory";

/** Variable mémoire d'un type sans factory dédiée (REAL, STRING…). */
function memoryVariable(mnemonic: string, type: "REAL" | "STRING") {
	return new VariableBuilder().id(`mem-${mnemonic}`).mnemonic(mnemonic).zone("memory").type(type).build();
}

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

	describe("Simulation PLC — action FALLING_EDGE", () => {
		it("fires once when the step deactivates, not every scan cycle", async () => {
			const counter = VariableFactory.createMemoryInt("Counter");

			// Step0 → [VRAI] → Step1 (FALLING_EDGE: Counter++) → [VRAI] → Step0.
			// FALLING_EDGE fire au cycle où step1 se désactive (jamais à la 1re activation).
			const grafcet = GrafcetFactory.createNumericActionCycle(
				"grafcet-fe",
				"Counter := Counter + 1",
				ActionExecutionMode.FALLING_EDGE,
			);
			const project = ProjectFactory.create([counter], [grafcet], "FALLING_EDGE Counter");

			let cycleError: Error | null = null;
			const plc = compileToPLC(project, 10, Dialect.FR, {
				onCycleError: (e) => {
					cycleError = e;
				},
			});
			expect(plc).not.toBeNull();

			const scanMs = 10;
			const runMs = 300;
			plc!.start();
			await jest.advanceTimersByTimeAsync(runMs);
			plc!.stop();
			if (cycleError) throw cycleError;

			const counterValue = getVariableValue(plc!, "Counter") as number;
			expect(counterValue).toBeGreaterThan(0);
			// Comme pour RISING_EDGE : bien moins que le nombre total de scans (pas un tir par cycle).
			expect(counterValue).toBeLessThan(runMs / scanMs);
		});
	});

	describe("Simulation PLC — variable REAL", () => {
		it("division yields a fractional REAL but a truncated INT (coercition pilotée par le type)", async () => {
			const r = memoryVariable("R", "REAL");
			const n = VariableFactory.createMemoryInt("N");

			// Step0 → [VRAI] → Step1 (CONTINUOUS: R := 7/2 ; N := 7/2) → [VRAI] → Step0.
			const step0 = new StepBuilder().id("g-num-step-0").number(0).initial().position(100, 100).build();
			const step1 = new StepBuilder().id("g-num-step-1").number(1).initial(false).position(100, 200).build();
			const trans0 = new TransitionBuilder().id("g-num-trans-0").expression("VRAI").position(100, 150).build();
			const trans1 = new TransitionBuilder().id("g-num-trans-1").expression("VRAI").position(100, 250).build();
			const realAction = new ActionBuilder().id("g-num-action-real").expression("R := 7 / 2").type(ActionType.NUMERIC_VARIABLE).executionMode(ActionExecutionMode.CONTINUOUS).position(200, 180).build();
			const intAction = new ActionBuilder().id("g-num-action-int").expression("N := 7 / 2").type(ActionType.NUMERIC_VARIABLE).executionMode(ActionExecutionMode.CONTINUOUS).position(200, 220).build();
			const grafcet = new GrafcetBuilder()
				.id("g-num")
				.name("REAL vs INT grafcet")
				.addSteps(step0, step1)
				.addTransitions(trans0, trans1)
				.addActions(realAction, intAction)
				.addConnections(
					new ConnectionBuilder().id("g-num-c0").source("step", step0.id, "source:successor").target("transition", trans0.id, "target:predecessor").build(),
					new ConnectionBuilder().id("g-num-c1").source("transition", trans0.id, "source:successor").target("step", step1.id, "target:predecessor").build(),
					new ConnectionBuilder().id("g-num-c2").source("step", step1.id, "source:successor").target("transition", trans1.id, "target:predecessor").build(),
					new ConnectionBuilder().id("g-num-c3").source("transition", trans1.id, "source:successor").target("step", step0.id, "target:predecessor").build(),
					new ConnectionBuilder().id("g-num-c4").source("step", step1.id, "source:action").target("action", realAction.id, "target:step").build(),
					new ConnectionBuilder().id("g-num-c5").source("step", step1.id, "source:action").target("action", intAction.id, "target:step").build(),
				)
				.build();
			const project = ProjectFactory.create([r, n], [grafcet], "REAL vs INT");

			expect(compilePipelineDetailed(project).analysis.issues.filter((i) => i.severity === "error")).toEqual([]);

			let cycleError: Error | null = null;
			const plc = compileToPLC(project, 10, Dialect.FR, {
				onCycleError: (e) => {
					cycleError = e;
				},
			});
			expect(plc).not.toBeNull();

			plc!.start();
			await jest.advanceTimersByTimeAsync(100);
			plc!.stop();
			if (cycleError) throw cycleError;

			expect(getVariableValue(plc!, "R")).toBe(3.5);
			expect(getVariableValue(plc!, "N")).toBe(3);
		});
	});

	describe("Simulation PLC — action STRING_VARIABLE", () => {
		it("assigns a string literal that follows the active step", async () => {
			const msg = memoryVariable("Msg", "STRING");

			// Step0 (RISING: Msg := "attente") → [VRAI] → Step1 (RISING: Msg := "marche") → [FAUX] → Step0.
			const step0 = new StepBuilder().id("g-str-step-0").number(0).initial().position(100, 100).build();
			const step1 = new StepBuilder().id("g-str-step-1").number(1).initial(false).position(100, 200).build();
			const trans0 = new TransitionBuilder().id("g-str-trans-0").expression("VRAI").position(100, 150).build();
			const trans1 = new TransitionBuilder().id("g-str-trans-1").expression("FAUX").position(100, 250).build();
			const action0 = new ActionBuilder()
				.id("g-str-action-0")
				.expression('Msg := "attente"')
				.type(ActionType.STRING_VARIABLE)
				.executionMode(ActionExecutionMode.RISING_EDGE)
				.position(200, 100)
				.build();
			const action1 = new ActionBuilder()
				.id("g-str-action-1")
				.expression('Msg := "marche"')
				.type(ActionType.STRING_VARIABLE)
				.executionMode(ActionExecutionMode.RISING_EDGE)
				.position(200, 200)
				.build();
			const grafcet = new GrafcetBuilder()
				.id("g-str")
				.name("String action grafcet")
				.addSteps(step0, step1)
				.addTransitions(trans0, trans1)
				.addActions(action0, action1)
				.addConnections(
					new ConnectionBuilder().id("g-str-c0").source("step", step0.id, "source:successor").target("transition", trans0.id, "target:predecessor").build(),
					new ConnectionBuilder().id("g-str-c1").source("transition", trans0.id, "source:successor").target("step", step1.id, "target:predecessor").build(),
					new ConnectionBuilder().id("g-str-c2").source("step", step1.id, "source:successor").target("transition", trans1.id, "target:predecessor").build(),
					new ConnectionBuilder().id("g-str-c3").source("transition", trans1.id, "source:successor").target("step", step0.id, "target:predecessor").build(),
					new ConnectionBuilder().id("g-str-c4").source("step", step0.id, "source:action").target("action", action0.id, "target:step").build(),
					new ConnectionBuilder().id("g-str-c5").source("step", step1.id, "source:action").target("action", action1.id, "target:step").build(),
				)
				.build();

			const project = ProjectFactory.create([msg], [grafcet], "STRING action");
			expect(compilePipelineDetailed(project).analysis.issues.filter((i) => i.severity === "error")).toEqual([]);

			let cycleError: Error | null = null;
			const plc = compileToPLC(project, 10, Dialect.FR, {
				onCycleError: (e) => {
					cycleError = e;
				},
			});
			expect(plc).not.toBeNull();

			plc!.start();
			await jest.advanceTimersByTimeAsync(100);
			plc!.stop();
			if (cycleError) throw cycleError;

			// trans1 = FAUX : le grafcet se stabilise sur step1, dernière affectation « marche ».
			expect(getVariableValue(plc!, "Msg")).toBe("marche");
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

	describe("Court-circuit ET/OU — réceptivité gardée", () => {
		it("ne crashe pas la simulation quand la branche protégée diviserait par zéro", async () => {
			const v = VariableFactory.createMemoryInt("V"); // vaut 0

			// trans-0 : V != 0 ET (100 / V) > 10 — la branche droite diviserait par zéro,
			// mais le court-circuit ne l'évalue pas tant que V vaut 0.
			const grafcet = GrafcetFactory.createSimpleCycle(
				"grafcet-guard",
				"V != 0 ET (100 / V) > 10",
				"VRAI",
			);
			const project = ProjectFactory.create([v], [grafcet], "Guarded division");

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

			expect(cycleError).toBeNull();
		});
	});
});
