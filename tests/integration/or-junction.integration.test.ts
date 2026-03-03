import { Language } from "@/simulator/compiler/lexer/language.enum";
import { GrafcetFactory } from "./utils/grafcet-factory";
import { ProjectFactory } from "./utils/project-factory";
import { compilePipelineDetailed, compileToPLC, getVariableValue, wait } from "./utils/test-helpers";
import { VariableFactory } from "./utils/variable-factory";

describe("OR Junction Integration Tests", () => {
	beforeEach(() => {
		VariableFactory.reset();
		ProjectFactory.reset();
	});

	describe("Divergence OU : pipeline compilation", () => {
		it("compiles a grafcet with OR divergence without errors", () => {
			const i0 = VariableFactory.createLogicInput("I0");
			const q0 = VariableFactory.createLogicOutput("Q0");
			const q1 = VariableFactory.createLogicOutput("Q1");

			// Step0 → [I0] branch1 → Step1 (Q0) ─[VRAI]─┐
			//       → [NON I0] branch2 → Step2 (Q1) ─[VRAI]─┤ JunctionOrEnd → Step0
			const grafcet = GrafcetFactory.createOrDivergenceCycle("grafcet-1", "I0", "NON I0", "Q0", "Q1");
			const project = ProjectFactory.create([i0, q0, q1], [grafcet], "OR Junction Test");

			const pipeline = compilePipelineDetailed(project);

			expect(pipeline.analysis.issues).toHaveLength(0);
			// X0, X1, X2 step variables
			expect(pipeline.analysis.stepsVariables).toHaveLength(3);
			expect(pipeline.preCompilation.errors).toEqual([]);
			expect(pipeline.compilation.errors).toEqual([]);
			expect(pipeline.compilation.result).toBeDefined();
			expect(pipeline.compilation.result!.routines).toHaveLength(1);
		});
	});

	describe("Divergence OU : simulation PLC", () => {
		// Note : les back-transitions ont la condition VRAI, donc les branches alternent
		// à chaque cycle (step0 ↔ stepN toutes les ~10ms). On ne peut pas lire la
		// valeur instantanée à l'arrêt — on track les valeurs pendant l'exécution
		// via onCycleEnd pour vérifier que la bonne branche a bien été activée.

		it("activates branch1 (Q0) when I0 is TRUE", async () => {
			const i0 = VariableFactory.createLogicInput("I0");
			const q0 = VariableFactory.createLogicOutput("Q0");
			const q1 = VariableFactory.createLogicOutput("Q1");

			const grafcet = GrafcetFactory.createOrDivergenceCycle("grafcet-1", "I0", "NON I0", "Q0", "Q1");
			const project = ProjectFactory.create([i0, q0, q1], [grafcet], "OR Junction Branch1");

			let cycleError: Error | null = null;
			let q0WasEverTrue = false;
			let q1WasEverTrue = false;
			const plc = compileToPLC(project, 10, Language.FR, {
				onCycleEnd: (p) => {
					if (getVariableValue(p, "Q0")) q0WasEverTrue = true;
					if (getVariableValue(p, "Q1")) q1WasEverTrue = true;
				},
				onCycleError: (e) => {
					cycleError = e;
				},
			});
			expect(plc).not.toBeNull();

			// I0=TRUE → branch1 eligible, branch2 (NON I0 = FALSE) never eligible
			plc!.setPhysicalInputValueByName("I0", true);
			plc!.start();
			await wait(400);
			plc!.stop();
			if (cycleError) throw cycleError;

			expect(q0WasEverTrue).toBe(true); // branch1 fired at least once
			expect(q1WasEverTrue).toBe(false); // branch2 never fired
		});

		it("activates branch2 (Q1) when I0 is FALSE", async () => {
			const i0 = VariableFactory.createLogicInput("I0");
			const q0 = VariableFactory.createLogicOutput("Q0");
			const q1 = VariableFactory.createLogicOutput("Q1");

			const grafcet = GrafcetFactory.createOrDivergenceCycle("grafcet-1", "I0", "NON I0", "Q0", "Q1");
			const project = ProjectFactory.create([i0, q0, q1], [grafcet], "OR Junction Branch2");

			let cycleError: Error | null = null;
			let q0WasEverTrue = false;
			let q1WasEverTrue = false;
			const plc = compileToPLC(project, 10, Language.FR, {
				onCycleEnd: (p) => {
					if (getVariableValue(p, "Q0")) q0WasEverTrue = true;
					if (getVariableValue(p, "Q1")) q1WasEverTrue = true;
				},
				onCycleError: (e) => {
					cycleError = e;
				},
			});
			expect(plc).not.toBeNull();

			// I0=FALSE → branch2 eligible, branch1 (I0 = FALSE) never eligible
			plc!.setPhysicalInputValueByName("I0", false);
			plc!.start();
			await wait(400);
			plc!.stop();
			if (cycleError) throw cycleError;

			expect(q0WasEverTrue).toBe(false); // branch1 never fired
			expect(q1WasEverTrue).toBe(true); // branch2 fired at least once
		});

		it("switches branch when I0 changes", async () => {
			const i0 = VariableFactory.createLogicInput("I0");
			const q0 = VariableFactory.createLogicOutput("Q0");
			const q1 = VariableFactory.createLogicOutput("Q1");

			const grafcet = GrafcetFactory.createOrDivergenceCycle("grafcet-1", "I0", "NON I0", "Q0", "Q1");
			const project = ProjectFactory.create([i0, q0, q1], [grafcet], "OR Junction Switch");

			let cycleError: Error | null = null;
			// Track activity per phase using a mutable reference
			const phase = { current: 1 };
			const fired = { p1Q0: false, p1Q1: false, p2Q0: false, p2Q1: false };

			const plc = compileToPLC(project, 10, Language.FR, {
				onCycleEnd: (p) => {
					if (phase.current === 1) {
						if (getVariableValue(p, "Q0")) fired.p1Q0 = true;
						if (getVariableValue(p, "Q1")) fired.p1Q1 = true;
					} else {
						if (getVariableValue(p, "Q0")) fired.p2Q0 = true;
						if (getVariableValue(p, "Q1")) fired.p2Q1 = true;
					}
				},
				onCycleError: (e) => {
					cycleError = e;
				},
			});
			expect(plc).not.toBeNull();

			// Phase 1: I0=TRUE → only branch1 eligible
			plc!.setPhysicalInputValueByName("I0", true);
			plc!.start();
			await wait(300);
			if (cycleError) throw cycleError;

			// Switch to phase 2: I0=FALSE → only branch2 eligible
			phase.current = 2;
			plc!.setPhysicalInputValueByName("I0", false);
			await wait(300);
			plc!.stop();
			if (cycleError) throw cycleError;

			expect(fired.p1Q0).toBe(true); // branch1 fired during phase 1
			expect(fired.p1Q1).toBe(false); // branch2 never fired during phase 1
			expect(fired.p2Q0).toBe(false); // branch1 never fired during phase 2
			expect(fired.p2Q1).toBe(true); // branch2 fired during phase 2
		});
	});
});
