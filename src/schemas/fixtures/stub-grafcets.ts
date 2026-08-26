import Grafcet, { DEFAULT_GRAFCET_FORMAT } from "@/schemas/grafcet/grafcet.schema";
import Step, {
	STEP_HANDLE_SOURCE_ACTION,
	STEP_HANDLE_SOURCE_SUCCESSOR,
	STEP_HANDLE_TARGET_PREDECESSOR,
} from "@/schemas/grafcet/step.schema";
import Transition, {
	TRANSITION_HANDLE_SOURCE_SUCCESSOR,
	TRANSITION_HANDLE_TARGET_PREDECESSOR,
} from "@/schemas/grafcet/transition.schema";
import Action, { ACTION_HANDLE_TARGET_STEP, ActionExecutionMode, ActionType } from "../grafcet/action.schema";
import ConnectionBuilder from "../grafcet/builders/connection.builder";

export function getStubGrafcetCoffeMachine(): Grafcet {
	const grafcet = new Grafcet("stub-grafcet-v1", "Distribution automatique", DEFAULT_GRAFCET_FORMAT);

	const step0 = new Step(
		"step-0",
		{ number: 0, initial: true },
		{ x: 50, y: 50 },
		Step.DEFAULT_DIMENSIONS,
	);
	const step1 = new Step("step-1", { number: 1 }, { x: 50, y: 150 }, Step.DEFAULT_DIMENSIONS);
	const step2 = new Step("step-2", { number: 2 }, { x: 50, y: 250 }, Step.DEFAULT_DIMENSIONS);
	const step3 = new Step("step-3", { number: 3 }, { x: 50, y: 350 }, Step.DEFAULT_DIMENSIONS);
	grafcet.steps.push(step0, step1, step2, step3);

	const action0 = new Action(
		"action-0",
		{
			type: ActionType.BOOLEAN_VARIABLE,
			executionMode: ActionExecutionMode.CONTINUOUS,
			expression: "DISTRIBUER_GOBELET",
		},
		{ x: 200, y: 150 },
		{ width: 200, height: 40 },
	);
	const action1 = new Action(
		"action-1",
		{
			type: ActionType.BOOLEAN_VARIABLE,
			executionMode: ActionExecutionMode.CONTINUOUS,
			expression: "REMPLISSAGE",
		},
		{ x: 200, y: 250 },
		{ width: 200, height: 40 },
	);
	grafcet.actions.push(action0, action1);

	const transition0 = new Transition(
		"transition-0",
		{ expression: "BP_DEMARRER" },
		{ x: 50, y: 100 },
		Transition.DEFAULT_DIMENSIONS,
	);
	const transition1 = new Transition(
		"transition-1",
		{ expression: "GOBELET_EN_POSITION ET t1/X1/2s" },
		{ x: 50, y: 200 },
		Transition.DEFAULT_DIMENSIONS,
	);
	const transition2 = new Transition(
		"transition-2",
		{ expression: "NIVEAU_LIQUIDE >= 80" },
		{ x: 50, y: 300 },
		Transition.DEFAULT_DIMENSIONS,
	);
	const transition3 = new Transition(
		"transition-3",
		{ expression: "NON GOBELET_EN_POSITION" },
		{ x: 50, y: 400 },
		Transition.DEFAULT_DIMENSIONS,
	);
	grafcet.transitions.push(transition0, transition1, transition2, transition3);
	grafcet.connections.push(
		ConnectionBuilder.betweenElements(
			"connection-0",
			step0,
			STEP_HANDLE_SOURCE_SUCCESSOR,
			transition0,
			TRANSITION_HANDLE_TARGET_PREDECESSOR,
		),
		ConnectionBuilder.betweenElements(
			"connection-1",
			transition0,
			TRANSITION_HANDLE_SOURCE_SUCCESSOR,
			step1,
			STEP_HANDLE_TARGET_PREDECESSOR,
		),
		ConnectionBuilder.betweenElements(
			"connection-2",
			step1,
			STEP_HANDLE_SOURCE_SUCCESSOR,
			transition1,
			TRANSITION_HANDLE_TARGET_PREDECESSOR,
		),
		ConnectionBuilder.betweenElements(
			"connection-3",
			transition1,
			TRANSITION_HANDLE_SOURCE_SUCCESSOR,
			step2,
			STEP_HANDLE_TARGET_PREDECESSOR,
		),
		ConnectionBuilder.betweenElements(
			"connection-4",
			step2,
			STEP_HANDLE_SOURCE_SUCCESSOR,
			transition2,
			TRANSITION_HANDLE_TARGET_PREDECESSOR,
		),
		ConnectionBuilder.betweenElements(
			"connection-5",
			transition2,
			TRANSITION_HANDLE_SOURCE_SUCCESSOR,
			step3,
			STEP_HANDLE_TARGET_PREDECESSOR,
		),
		ConnectionBuilder.betweenElements(
			"connection-6",
			step3,
			STEP_HANDLE_SOURCE_SUCCESSOR,
			transition3,
			TRANSITION_HANDLE_TARGET_PREDECESSOR,
		),
		ConnectionBuilder.betweenElements(
			"connection-7",
			transition3,
			TRANSITION_HANDLE_SOURCE_SUCCESSOR,
			step0,
			STEP_HANDLE_TARGET_PREDECESSOR,
		),

		ConnectionBuilder.betweenElements(
			"connection-8",
			step1,
			STEP_HANDLE_SOURCE_ACTION,
			action0,
			ACTION_HANDLE_TARGET_STEP,
		),
		ConnectionBuilder.betweenElements(
			"connection-9",
			step2,
			STEP_HANDLE_SOURCE_ACTION,
			action1,
			ACTION_HANDLE_TARGET_STEP,
		),
	);
	return grafcet;
}
