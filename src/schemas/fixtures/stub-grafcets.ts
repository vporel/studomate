import Grafcet, { DEFAULT_GRAFCET_FORMAT } from "@/schemas/grafcet/grafcet.schema";
import Step, {
	STEP_HANDLE_SOURCE_SUCCESSOR,
	STEP_HANDLE_TARGET_PREDECESSOR,
} from "@/schemas/grafcet/step.schema";
import Transition, {
	TRANSITION_HANDLE_SOURCE_SUCCESSOR,
	TRANSITION_HANDLE_TARGET_PREDECESSOR,
} from "@/schemas/grafcet/transition.schema";
import ConnectionBuilder from "../grafcet/builders/connection.builder";

/**
 * A valid grafcet with
 * - 2 steps (0 and 1)
 * - 2 transitions
 * @returns
 */
export function getStubGrafcetV1(): Grafcet {
	const grafcet = new Grafcet("stub-grafcet-v1", "Stub Grafcet V1", DEFAULT_GRAFCET_FORMAT);

	const step0 = new Step(
		"step-0",
		{ number: 0, initial: true, ...Step.DEFAULT_DIMENSIONS },
		{ x: 50, y: 50 },
	);
	const step1 = new Step("step-1", { number: 1, ...Step.DEFAULT_DIMENSIONS }, { x: 50, y: 250 });
	grafcet.steps.push(step0, step1);

	const transition0 = new Transition(
		"transition-0",
		{ expression: "Var1", ...Transition.DEFAULT_DIMENSIONS },
		{ x: 50, y: 150 },
	);
	const transition1 = new Transition(
		"transition-1",
		{ expression: "Var2", ...Transition.DEFAULT_DIMENSIONS },
		{ x: 50, y: 350 },
	);
	grafcet.transitions.push(transition0, transition1);
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
			step0,
			STEP_HANDLE_TARGET_PREDECESSOR,
		),
	);
	return grafcet;
}
