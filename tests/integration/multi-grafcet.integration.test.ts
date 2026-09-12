import { ActionExecutionMode } from "@/schemas/grafcet/action.schema";
import { Dialect } from "@/expression-language/dialect.enum";
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import {
	compilePipelineDetailed,
	compileToPLC,
	expectVariableValue,
	getVariableValue,
} from "@tests/utils/test-helpers";
import { VariableFactory } from "@tests/utils/variable-factory";

describe("Multi-Grafcet Integration Tests", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		VariableFactory.reset();
		ProjectFactory.reset();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	// ──────────────────────────────────────────────────────────────
	// Compilation
	// ──────────────────────────────────────────────────────────────
	describe("Compilation pipeline", () => {
		it("compiles a project with two independent grafcets without errors", () => {
			// G1: steps 0/1  → variables X0, X1
			// G2: steps 10/11 → variables X10, X11
			const i0 = VariableFactory.createLogicInput("I0");
			const i1 = VariableFactory.createLogicInput("I1");

			const g1 = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0", 0);
			const g2 = GrafcetFactory.createSimpleCycle("g2", "I1", "NON I1", 10);

			const project = ProjectFactory.create([i0, i1], [g1, g2], "Multi-Grafcet Test");
			const pipeline = compilePipelineDetailed(project);

			expect(pipeline.analysis.issues).toEqual([]);
			// 4 step variables: X0, X1 (G1) + X10, X11 (G2)
			expect(pipeline.analysis.generatedVariables).toHaveLength(4);
			expect(pipeline.analysis.generatedVariables.map((v) => v.mnemonic)).toEqual(
				expect.arrayContaining(["X0", "X1", "X10", "X11"]),
			);
			expect(pipeline.preCompilation.errors).toEqual([]);
			expect(pipeline.compilation.errors).toEqual([]);
			// Une routine par grafcet (2) + la routine des mémos d'étape + la routine
			// d'initialisation + le Main (voir Project.createMain) + la routine d'observation
			// des réceptivités.
			expect(pipeline.compilation.result!.routines).toHaveLength(6);
		});

		it("step variables of each grafcet are properly isolated (no duplicates)", () => {
			const g1 = GrafcetFactory.createSimpleCycle("g1", "VRAI", "VRAI", 0);
			const g2 = GrafcetFactory.createSimpleCycle("g2", "VRAI", "VRAI", 20);

			const project = ProjectFactory.create([], [g1, g2]);
			const pipeline = compilePipelineDetailed(project);

			const mnemonics = pipeline.analysis.generatedVariables.map((v) => v.mnemonic);
			// No duplicates across grafcets
			expect(new Set(mnemonics).size).toBe(mnemonics.length);
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Simulation – independent parallel execution
	// ──────────────────────────────────────────────────────────────
	describe("Simulation: independent parallel execution", () => {
		it("G1 activates when I0 is TRUE without interfering with G2", async () => {
			// G1: step0 → [I0] → step1 (CONTINUOUS Q0) → [NOT I0] → step0
			// G2: step10 → [I1] → step11 (CONTINUOUS Q1) → [NOT I1] → step10
			const i0 = VariableFactory.createLogicInput("I0");
			const i1 = VariableFactory.createLogicInput("I1");
			const q0 = VariableFactory.createLogicOutput("Q0");
			const q1 = VariableFactory.createLogicOutput("Q1");

			const g1 = GrafcetFactory.createCycleWithBooleanActions(
				"g1",
				"",
				"Q0",
				"I0",
				"NON I0",
				ActionExecutionMode.SET,
				ActionExecutionMode.CONTINUOUS,
				0,
			);
			const g2 = GrafcetFactory.createCycleWithBooleanActions(
				"g2",
				"",
				"Q1",
				"I1",
				"NON I1",
				ActionExecutionMode.SET,
				ActionExecutionMode.CONTINUOUS,
				10,
			);

			const project = ProjectFactory.create([i0, i1, q0, q1], [g1, g2]);

			let cycleError: Error | null = null;
			const plc = compileToPLC(project, 10, Dialect.FR, {
				onCycleError: (e) => {
					cycleError = e;
				},
			});
			expect(plc).not.toBeNull();

			// Only I0 active: only Q0 should activate
			plc!.setPhysicalInputValueByName("I0", true);
			plc!.setPhysicalInputValueByName("I1", false);
			plc!.start();
			await jest.advanceTimersByTimeAsync(200);
			if (cycleError) throw cycleError;

			expectVariableValue(plc!, "Q0", true);
			expectVariableValue(plc!, "Q1", false);
			plc!.stop();
		});

		it("G2 activates when I1 is TRUE without interfering with G1", async () => {
			const i0 = VariableFactory.createLogicInput("I0");
			const i1 = VariableFactory.createLogicInput("I1");
			const q0 = VariableFactory.createLogicOutput("Q0");
			const q1 = VariableFactory.createLogicOutput("Q1");

			const g1 = GrafcetFactory.createCycleWithBooleanActions(
				"g1",
				"",
				"Q0",
				"I0",
				"NON I0",
				ActionExecutionMode.SET,
				ActionExecutionMode.CONTINUOUS,
				0,
			);
			const g2 = GrafcetFactory.createCycleWithBooleanActions(
				"g2",
				"",
				"Q1",
				"I1",
				"NON I1",
				ActionExecutionMode.SET,
				ActionExecutionMode.CONTINUOUS,
				10,
			);

			const project = ProjectFactory.create([i0, i1, q0, q1], [g1, g2]);

			let cycleError: Error | null = null;
			const plc = compileToPLC(project, 10, Dialect.FR, {
				onCycleError: (e) => {
					cycleError = e;
				},
			});
			expect(plc).not.toBeNull();

			// Only I1 active: only Q1 should activate
			plc!.setPhysicalInputValueByName("I0", false);
			plc!.setPhysicalInputValueByName("I1", true);
			plc!.start();
			await jest.advanceTimersByTimeAsync(200);
			if (cycleError) throw cycleError;

			expectVariableValue(plc!, "Q0", false);
			expectVariableValue(plc!, "Q1", true);
			plc!.stop();
		});

		it("both grafcets activate simultaneously when both inputs are TRUE", async () => {
			const i0 = VariableFactory.createLogicInput("I0");
			const i1 = VariableFactory.createLogicInput("I1");
			const q0 = VariableFactory.createLogicOutput("Q0");
			const q1 = VariableFactory.createLogicOutput("Q1");

			const g1 = GrafcetFactory.createCycleWithBooleanActions(
				"g1",
				"",
				"Q0",
				"I0",
				"NON I0",
				ActionExecutionMode.SET,
				ActionExecutionMode.CONTINUOUS,
				0,
			);
			const g2 = GrafcetFactory.createCycleWithBooleanActions(
				"g2",
				"",
				"Q1",
				"I1",
				"NON I1",
				ActionExecutionMode.SET,
				ActionExecutionMode.CONTINUOUS,
				10,
			);

			const project = ProjectFactory.create([i0, i1, q0, q1], [g1, g2]);

			let cycleError: Error | null = null;
			const plc = compileToPLC(project, 10, Dialect.FR, {
				onCycleError: (e) => {
					cycleError = e;
				},
			});
			expect(plc).not.toBeNull();

			plc!.setPhysicalInputValueByName("I0", true);
			plc!.setPhysicalInputValueByName("I1", true);
			plc!.start();
			await jest.advanceTimersByTimeAsync(200);
			if (cycleError) throw cycleError;

			expectVariableValue(plc!, "Q0", true);
			expectVariableValue(plc!, "Q1", true);
			plc!.stop();
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Simulation – cross-grafcet dependency via shared variable
	// ──────────────────────────────────────────────────────────────
	describe("Simulation: cross-grafcet dependency via shared variable", () => {
		it("G2 waits for G1 to set Q0 before transitioning", async () => {
			// G1: step0 → [TRUE] → step1 (SET Q0) → [TRUE] → step0
			//     G1 cycles freely; Q0 stays true (SET = latch)
			// G2: step10 → [Q0] → step11 (SET Q1) → [TRUE] → step10
			//     G2 can only cross its transition once Q0 is true
			const q0 = VariableFactory.createLogicOutput("Q0");
			const q1 = VariableFactory.createLogicOutput("Q1");

			const g1 = GrafcetFactory.createCycleWithBooleanActions(
				"g1",
				"",
				"Q0",
				"VRAI",
				"VRAI",
				ActionExecutionMode.SET,
				ActionExecutionMode.SET,
				0,
			);
			const g2 = GrafcetFactory.createCycleWithBooleanActions(
				"g2",
				"",
				"Q1",
				"Q0",
				"VRAI",
				ActionExecutionMode.SET,
				ActionExecutionMode.SET,
				10,
			);

			const project = ProjectFactory.create([q0, q1], [g1, g2]);

			let cycleError: Error | null = null;
			const plc = compileToPLC(project, 10, Dialect.FR, {
				onCycleError: (e) => {
					cycleError = e;
				},
			});
			expect(plc).not.toBeNull();

			// Initially both outputs are false
			expectVariableValue(plc!, "Q0", false);
			expectVariableValue(plc!, "Q1", false);

			plc!.start();
			await jest.advanceTimersByTimeAsync(300);
			plc!.stop();
			if (cycleError) throw cycleError;

			// G1 cycled and latched Q0 := true
			// G2 detected Q0=true and latched Q1 := true
			expectVariableValue(plc!, "Q0", true);
			expectVariableValue(plc!, "Q1", true);
		});

		it("G2 does not transition before G1 has activated Q0", async () => {
			// Same scenario but verifying the blocked state:
			// Q1 must remain false if Q0 has never been set.
			const q0 = VariableFactory.createLogicOutput("Q0");
			const q1 = VariableFactory.createLogicOutput("Q1");

			// G1 held at initial step: transition forced to FALSE, Q0 is never set
			const g1 = GrafcetFactory.createSimpleCycle("g1", "FAUX", "VRAI", 0);
			const g2 = GrafcetFactory.createCycleWithBooleanActions(
				"g2",
				"",
				"Q1",
				"Q0",
				"VRAI",
				ActionExecutionMode.SET,
				ActionExecutionMode.SET,
				10,
			);

			const project = ProjectFactory.create([q0, q1], [g1, g2]);

			let cycleError: Error | null = null;
			const plc = compileToPLC(project, 10, Dialect.FR, {
				onCycleError: (e) => {
					cycleError = e;
				},
			});
			expect(plc).not.toBeNull();

			plc!.start();
			await jest.advanceTimersByTimeAsync(300);
			plc!.stop();
			if (cycleError) throw cycleError;

			// Q0 never set → G2 blocked → Q1 stays false
			expectVariableValue(plc!, "Q0", false);
			expectVariableValue(plc!, "Q1", false);
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Simulation – référence directe à l'étape d'un autre grafcet (Xn)
	// ──────────────────────────────────────────────────────────────
	describe("Simulation: cross-grafcet step reference (Xn)", () => {
		/**
		 * G2 franchit sur `X1`, l'étape 1 de G1, référencée directement par son mnémonique.
		 * G1 : step0 → [I0] → step1 (reste actif tant que I0 est vrai).
		 * G2 : step10 → [X1] → step11 → [NON X1] → step10.
		 *
		 * Enregistre la trace (X1, X11) à chaque cycle. Les deux grafcets sont compilés dans
		 * les deux ordres d'insertion (`[g1, g2]` puis `[g2, g1]`) : si la réceptivité de G2 lisait
		 * la valeur vive de X1 au lieu de son mémo figé en début de cycle, la trace dépendrait de
		 * l'ordre — exactement le bug corrigé par `ProjectPreCompiler.rebindStepReferencesToMemos`.
		 */
		function runTrace(order: "g1-first" | "g2-first"): { x1: boolean; x11: boolean }[] {
			const i0 = VariableFactory.createLogicInput("I0");
			const g1 = GrafcetFactory.createSimpleCycle("g1", "I0", "NON I0", 0);
			const g2 = GrafcetFactory.createSimpleCycle("g2", "X1", "NON X1", 10);
			const grafcets = order === "g1-first" ? [g1, g2] : [g2, g1];
			const project = ProjectFactory.create([i0], grafcets);

			const trace: { x1: boolean; x11: boolean }[] = [];
			let cycleError: Error | null = null;
			const plc = compileToPLC(project, 10, Dialect.FR, {
				onCycleEnd: (p) =>
					trace.push({
						x1: getVariableValue(p, "X1"),
						x11: getVariableValue(p, "X11"),
					}),
				onCycleError: (e) => {
					cycleError = e;
				},
			});
			expect(plc).not.toBeNull();

			plc!.setPhysicalInputValueByName("I0", true);
			plc!.start();
			jest.advanceTimersByTime(200);
			plc!.stop();
			if (cycleError) throw cycleError;
			return trace;
		}

		it("G2 reacts to G1's step deterministically, independently of program order", () => {
			VariableFactory.reset();
			ProjectFactory.reset();
			const traceG1First = runTrace("g1-first");

			VariableFactory.reset();
			ProjectFactory.reset();
			const traceG2First = runTrace("g2-first");

			expect(traceG1First).toEqual(traceG2First);
			// La référence croisée doit bien produire un effet : G2 finit par suivre G1.
			expect(traceG1First.some((c) => c.x11)).toBe(true);
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Simulation – step isolation between grafcets
	// ──────────────────────────────────────────────────────────────
	describe("Simulation: step isolation between grafcets", () => {
		it("steps of G1 and G2 evolve independently", async () => {
			// G1 blocked at step0 (transition = FALSE)
			// G2 cycles freely (transitions = TRUE)
			const g1 = GrafcetFactory.createSimpleCycle("g1", "FAUX", "VRAI", 0);
			const g2 = GrafcetFactory.createSimpleCycle("g2", "VRAI", "VRAI", 10);

			const project = ProjectFactory.create([], [g1, g2]);

			let cycleError: Error | null = null;
			const plc = compileToPLC(project, 10, Dialect.FR, {
				onCycleError: (e) => {
					cycleError = e;
				},
			});
			expect(plc).not.toBeNull();

			plc!.start();
			await jest.advanceTimersByTimeAsync(300);
			plc!.stop();
			if (cycleError) throw cycleError;

			// G1 stayed blocked at initial step (X0=true, X1=false)
			expectVariableValue(plc!, "X0", true);
			expectVariableValue(plc!, "X1", false);

			// G2 cycled: exactly one of its steps is active at any point
			const x10 = getVariableValue(plc!, "X10");
			const x11 = getVariableValue(plc!, "X11");
			expect(x10 || x11).toBe(true);
			expect(x10 && x11).toBe(false);
		});
	});
});
