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
import type { Locale } from "@/i18n/config";
import createTemplateText from "@/templates/template-text";

/**
 * Creates a pre-configured "Timer cycle" project: two boolean outputs and no program. Training
 * module observation (A1): the cycle runs on time alone.
 */
export function createTimerCycleProject(locale: Locale = "fr"): Project {
	const t = createTemplateText("timer-cycle", locale);
	const project = new Project(createRandomId(), t("projectName"), "");

	project.variables.push(
		VariableBuilder.buildLogicOutput(createRandomId(), "sortie1"),
		VariableBuilder.buildLogicOutput(createRandomId(), "sortie2"),
	);

	return project;
}

/**
 * Full, simulable version: a 2-step GRAFCET whose two transitions are timed, no input.
 *
 * Sequence: E0 (initial, sortie1) --t0/X0/4s--> E1 (sortie2) --t1/X1/2s--> E0
 */
export function createTimerCycleSolution(locale: Locale = "fr"): Project {
	const t = createTemplateText("timer-cycle", locale);
	const project = createTimerCycleProject(locale);
	project.name = t("solutionName");

	const X = 200;
	const e0 = new StepBuilder()
		.id(createRandomId())
		.number(0)
		.initial()
		.position(X, 60)
		.build();
	const t0 = new TransitionBuilder()
		.id(createRandomId())
		.expression("t0/X0/4s")
		.position(X, 110)
		.build();
	const e1 = new StepBuilder()
		.id(createRandomId())
		.number(1)
		.position(X, 160)
		.build();
	const t1 = new TransitionBuilder()
		.id(createRandomId())
		.expression("t1/X1/2s")
		.position(X, 210)
		.build();

	const a0 = new ActionBuilder()
		.id(createRandomId())
		.expression("sortie1")
		.type(ActionType.BOOLEAN_VARIABLE)
		.executionMode(ActionExecutionMode.CONTINUOUS)
		.position(X + 80, 60)
		.build();
	const a1 = new ActionBuilder()
		.id(createRandomId())
		.expression("sortie2")
		.type(ActionType.BOOLEAN_VARIABLE)
		.executionMode(ActionExecutionMode.CONTINUOUS)
		.position(X + 80, 160)
		.build();

	const grafcet = new GrafcetBuilder()
		.id(createRandomId())
		.name(t("grafcetName"))
		.addSteps(e0, e1)
		.addTransitions(t0, t1)
		.addActions(a0, a1)
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
				e0,
				STEP_HANDLE_TARGET_PREDECESSOR,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				e0,
				STEP_HANDLE_SOURCE_ACTION,
				a0,
				ACTION_HANDLE_TARGET_STEP,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				e1,
				STEP_HANDLE_SOURCE_ACTION,
				a1,
				ACTION_HANDLE_TARGET_STEP,
			),
		)
		.build();

	project.addProgram(grafcet);
	return project;
}
