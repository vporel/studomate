import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import {
	ActionExecutionMode,
	ActionType,
	ACTION_HANDLE_TARGET_STEP,
} from "@/schemas/grafcet/action.schema";
import {
	STEP_HANDLE_SOURCE_SUCCESSOR,
	STEP_HANDLE_TARGET_PREDECESSOR,
	STEP_HANDLE_SOURCE_ACTION,
} from "@/schemas/grafcet/step.schema";
import {
	TRANSITION_HANDLE_TARGET_PREDECESSOR,
	TRANSITION_HANDLE_SOURCE_SUCCESSOR,
} from "@/schemas/grafcet/transition.schema";
import Project from "@/schemas/project/project.schema";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import { createRandomId } from "@/ids";

/**
 * Creates a pre-configured "Linear sequence" project: boolean input/output variables, no
 * program (the student writes it). Training module mini-exercise (M1): no timer, no
 * divergence, just a step → transition → step chain.
 */
export function createLinearSequenceProject(): Project {
	const project = new Project(createRandomId(), "Séquence linéaire", "");

	project.variables.push(
		VariableBuilder.buildLogicInput(createRandomId(), "dcy"),
		VariableBuilder.buildLogicInput(createRandomId(), "fin1"),
		VariableBuilder.buildLogicInput(createRandomId(), "fin2"),
		VariableBuilder.buildLogicOutput(createRandomId(), "sortie1"),
		VariableBuilder.buildLogicOutput(createRandomId(), "sortie2"),
	);

	return project;
}

/**
 * Full, simulable version: a 4-step GRAFCET, a single chain (no divergence), simple boolean
 * receptivities, no timer.
 *
 * Sequence: E0 (initial) --dcy--> E1 (sortie1) --fin1--> E2 (sortie2) --fin2--> E3 --VRAI--> E0
 */
export function createLinearSequenceSolution(): Project {
	const project = createLinearSequenceProject();
	project.name = "Séquence linéaire : solution";

	const X = 200;
	const e0 = new StepBuilder()
		.id(createRandomId())
		.number(0)
		.initial()
		.position(X, 60)
		.build();
	const t0 = new TransitionBuilder()
		.id(createRandomId())
		.expression("dcy")
		.position(X, 110)
		.build();
	const e1 = new StepBuilder().id(createRandomId()).number(1).position(X, 160).build();
	const t1 = new TransitionBuilder()
		.id(createRandomId())
		.expression("fin1")
		.position(X, 210)
		.build();
	const e2 = new StepBuilder().id(createRandomId()).number(2).position(X, 260).build();
	const t2 = new TransitionBuilder()
		.id(createRandomId())
		.expression("fin2")
		.position(X, 310)
		.build();
	const e3 = new StepBuilder().id(createRandomId()).number(3).position(X, 360).build();
	const t3 = new TransitionBuilder()
		.id(createRandomId())
		.expression("VRAI")
		.position(X, 410)
		.build();

	const a1 = new ActionBuilder()
		.id(createRandomId())
		.expression("sortie1")
		.type(ActionType.BOOLEAN_VARIABLE)
		.executionMode(ActionExecutionMode.CONTINUOUS)
		.position(X + 80, 160)
		.build();
	const a2 = new ActionBuilder()
		.id(createRandomId())
		.expression("sortie2")
		.type(ActionType.BOOLEAN_VARIABLE)
		.executionMode(ActionExecutionMode.CONTINUOUS)
		.position(X + 80, 260)
		.build();

	const grafcet = new GrafcetBuilder()
		.id(createRandomId())
		.name("Séquence")
		.addSteps(e0, e1, e2, e3)
		.addTransitions(t0, t1, t2, t3)
		.addActions(a1, a2)
		.addConnections(
			ConnectionBuilder.betweenElements(
				createRandomId(),
				e0,
				STEP_HANDLE_SOURCE_SUCCESSOR,
				t0,
				TRANSITION_HANDLE_TARGET_PREDECESSOR,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				t0,
				TRANSITION_HANDLE_SOURCE_SUCCESSOR,
				e1,
				STEP_HANDLE_TARGET_PREDECESSOR,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				e1,
				STEP_HANDLE_SOURCE_SUCCESSOR,
				t1,
				TRANSITION_HANDLE_TARGET_PREDECESSOR,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				t1,
				TRANSITION_HANDLE_SOURCE_SUCCESSOR,
				e2,
				STEP_HANDLE_TARGET_PREDECESSOR,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				e2,
				STEP_HANDLE_SOURCE_SUCCESSOR,
				t2,
				TRANSITION_HANDLE_TARGET_PREDECESSOR,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				t2,
				TRANSITION_HANDLE_SOURCE_SUCCESSOR,
				e3,
				STEP_HANDLE_TARGET_PREDECESSOR,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				e3,
				STEP_HANDLE_SOURCE_SUCCESSOR,
				t3,
				TRANSITION_HANDLE_TARGET_PREDECESSOR,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				t3,
				TRANSITION_HANDLE_SOURCE_SUCCESSOR,
				e0,
				STEP_HANDLE_TARGET_PREDECESSOR,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				e1,
				STEP_HANDLE_SOURCE_ACTION,
				a1,
				ACTION_HANDLE_TARGET_STEP,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				e2,
				STEP_HANDLE_SOURCE_ACTION,
				a2,
				ACTION_HANDLE_TARGET_STEP,
			),
		)
		.build();

	project.addProgram(grafcet);
	return project;
}
