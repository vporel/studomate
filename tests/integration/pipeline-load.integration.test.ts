import { Dialect } from "@/expression-language/dialect.enum";
import { ActionExecutionMode, ActionType } from "@/schemas/grafcet/action.schema";
import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";
import { compileToPLC } from "@tests/utils/test-helpers";

/**
 * Garde-fou de perf, pas une mesure fine : le seuil (3 s pour ~2000 cycles sur un projet
 * volumineux) est très large — le temps réel est de l'ordre de 100 ms — et ne se déclenche
 * donc que sur une régression massive de la boucle chaude (analyse, compilation, cycle PLC).
 * Double usage : smoke test « le pipeline encaisse un projet plus gros que les fixtures ».
 */
describe("Pipeline — garde-fou de charge", () => {
	/** Anneau de `stepCount` étapes : chaque étape franchit vers la suivante, la dernière
	 * reboucle sur l'initiale. Une transition sur cinq est temporisée, une étape sur deux porte
	 * une action booléenne. */
	function buildRingGrafcet(stepCount: number): Grafcet {
		const builder = new GrafcetBuilder().id("g-load").name("Charge");
		for (let i = 0; i < stepCount; i++) {
			builder.addStep(
				new StepBuilder()
					.id(`s${i}`)
					.number(i)
					.initial(i === 0)
					.position(100, 100 * i)
					.build(),
			);
			const timed = i % 5 === 0;
			builder.addTransition(
				new TransitionBuilder()
					.id(`t${i}`)
					.expression(timed ? `T${i}/go/50ms` : "go OU X0")
					.position(120, 100 * i + 50)
					.build(),
			);
			if (i % 2 === 0) {
				builder.addAction(
					new ActionBuilder()
						.id(`a${i}`)
						.type(ActionType.BOOLEAN_VARIABLE)
						.executionMode(ActionExecutionMode.SET)
						.expression("flag")
						.position(220, 100 * i)
						.build(),
				);
				builder.addConnection(
					new ConnectionBuilder()
						.id(`ca${i}`)
						.source("step", `s${i}`, "source:action")
						.target("action", `a${i}`, "target:step")
						.build(),
				);
			}
		}
		for (let i = 0; i < stepCount; i++) {
			const next = (i + 1) % stepCount;
			builder.addConnection(
				new ConnectionBuilder()
					.id(`cs${i}`)
					.source("step", `s${i}`, "source:successor")
					.target("transition", `t${i}`, "target:predecessor")
					.build(),
			);
			builder.addConnection(
				new ConnectionBuilder()
					.id(`ct${i}`)
					.source("transition", `t${i}`, "source:successor")
					.target("step", `s${next}`, "target:predecessor")
					.build(),
			);
		}
		return builder.build();
	}

	it("analyse + compile + 2000 cycles PLC sur un grafcet de 40 étapes en moins de 3 s", () => {
		const project = new Project("p-load", "Charge", "");
		project.variables = [
			new Variable("v-go", "go", "logic-input", "BOOL"),
			new Variable("v-flag", "flag", "memory", "BOOL"),
		];
		project.addProgram(buildRingGrafcet(40));

		const start = performance.now();

		let cycleError: Error | null = null;
		const plc = compileToPLC(project, 10, Dialect.FR, {
			onCycleError: (e) => (cycleError = e),
		});
		expect(plc).not.toBeNull();

		plc!.start();
		plc!.pause();
		plc!.setPhysicalInputValueById("v-go", true);
		for (let i = 0; i < 2000; i++) plc!.stepOnce();
		plc!.stop();

		const durationMs = performance.now() - start;

		if (cycleError) throw cycleError;
		expect(durationMs).toBeLessThan(3000);
	});
});
