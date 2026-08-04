import { ActionExecutionMode, ActionType } from "@/schemas/grafcet/action.schema";
import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import JunctionAndEndBuilder from "@/schemas/grafcet/builders/junction-and-end.builder";
import JunctionAndStartBuilder from "@/schemas/grafcet/builders/junction-and-start.builder";
import JunctionOrEndBuilder from "@/schemas/grafcet/builders/junction-or-end.builder";
import JunctionOrStartBuilder from "@/schemas/grafcet/builders/junction-or-start.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import Grafcet from "@/schemas/grafcet/grafcet.schema";

/**
 * Factory for creating test grafcets with common patterns
 */
export class GrafcetFactory {
	/**
	 * Creates a simple 2-step grafcet with a cycle (step0 → step1 → step0)
	 * @param grafcetId ID for the grafcet
	 * @param trans0Condition Condition for transition from step0 to step1
	 * @param trans1Condition Condition for transition from step1 to step0
	 * @param startNumber Starting step number (default 0)
	 * @returns A complete grafcet with 2 steps, 2 transitions, and connections
	 */
	static createSimpleCycle(
		grafcetId: string,
		trans0Condition: string = "VRAI",
		trans1Condition: string = "VRAI",
		startNumber: number = 0,
	): Grafcet {
		const step0 = new StepBuilder()
			.id(`${grafcetId}-step-0`)
			.number(startNumber)
			.initial()
			.position(100, 100)
			.build();

		const step1 = new StepBuilder()
			.id(`${grafcetId}-step-1`)
			.number(startNumber + 1)
			.initial(false)
			.position(100, 200)
			.build();

		const trans0 = new TransitionBuilder()
			.id(`${grafcetId}-trans-0`)
			.expression(trans0Condition)
			.position(100, 150)
			.build();

		const trans1 = new TransitionBuilder()
			.id(`${grafcetId}-trans-1`)
			.expression(trans1Condition)
			.position(100, 250)
			.build();

		const conn0 = new ConnectionBuilder()
			.id(`${grafcetId}-conn-0`)
			.source("step", `${grafcetId}-step-0`, "source:successor")
			.target("transition", `${grafcetId}-trans-0`, "target:predecessor")
			.build();

		const conn1 = new ConnectionBuilder()
			.id(`${grafcetId}-conn-1`)
			.source("transition", `${grafcetId}-trans-0`, "source:successor")
			.target("step", `${grafcetId}-step-1`, "target:predecessor")
			.build();

		const conn2 = new ConnectionBuilder()
			.id(`${grafcetId}-conn-2`)
			.source("step", `${grafcetId}-step-1`, "source:successor")
			.target("transition", `${grafcetId}-trans-1`, "target:predecessor")
			.build();

		const conn3 = new ConnectionBuilder()
			.id(`${grafcetId}-conn-3`)
			.source("transition", `${grafcetId}-trans-1`, "source:successor")
			.target("step", `${grafcetId}-step-0`, "target:predecessor")
			.build();

		return new GrafcetBuilder()
			.id(grafcetId)
			.name("Simple Cycle Grafcet")
			.addSteps(step0, step1)
			.addTransitions(trans0, trans1)
			.addConnections(conn0, conn1, conn2, conn3)
			.build();
	}

	/**
	 * Creates a 2-step grafcet with boolean actions on each step
	 * @param grafcetId ID for the grafcet
	 * @param step0Variable Variable name for action on step 0 - empty string to skip
	 * @param step1Variable Variable name for action on step 1 - empty string to skip
	 * @param trans0Condition Condition for transition from step0 to step1
	 * @param trans1Condition Condition for transition from step1 to step0
	 * @param step0Mode Execution mode for step 0 action (default: SET)
	 * @param step1Mode Execution mode for step 1 action (default: SET)
	 * @returns A complete grafcet with steps, transitions, actions, and connections
	 */
	static createCycleWithBooleanActions(
		grafcetId: string,
		step0Variable: string,
		step1Variable: string,
		trans0Condition: string = "VRAI",
		trans1Condition: string = "VRAI",
		step0Mode: ActionExecutionMode = ActionExecutionMode.SET,
		step1Mode: ActionExecutionMode = ActionExecutionMode.SET,
		startNumber: number = 0,
	): Grafcet {
		const step0 = new StepBuilder()
			.id(`${grafcetId}-step-0`)
			.number(startNumber)
			.initial()
			.position(100, 100)
			.build();

		const step1 = new StepBuilder()
			.id(`${grafcetId}-step-1`)
			.number(startNumber + 1)
			.initial(false)
			.position(100, 200)
			.build();

		const trans0 = new TransitionBuilder()
			.id(`${grafcetId}-trans-0`)
			.expression(trans0Condition)
			.position(100, 150)
			.build();

		const trans1 = new TransitionBuilder()
			.id(`${grafcetId}-trans-1`)
			.expression(trans1Condition)
			.position(100, 250)
			.build();

		const actions = [];
		const actionConnections = [];

		// Only create actions if variable names are not empty
		if (step0Variable && step0Variable.trim() !== "") {
			const action0 = new ActionBuilder()
				.id(`${grafcetId}-action-0`)
				.expression(step0Variable)
				.type(ActionType.BOOLEAN_VARIABLE)
				.executionMode(step0Mode)
				.position(200, 100)
				.build();
			actions.push(action0);
			actionConnections.push(
				new ConnectionBuilder()
					.id(`${grafcetId}-conn-4`)
					.source("step", `${grafcetId}-step-0`, "source:action")
					.target("action", `${grafcetId}-action-0`, "target:step")
					.build(),
			);
		}

		if (step1Variable && step1Variable.trim() !== "") {
			const action1 = new ActionBuilder()
				.id(`${grafcetId}-action-1`)
				.expression(step1Variable)
				.type(ActionType.BOOLEAN_VARIABLE)
				.executionMode(step1Mode)
				.position(200, 200)
				.build();
			actions.push(action1);
			actionConnections.push(
				new ConnectionBuilder()
					.id(`${grafcetId}-conn-5`)
					.source("step", `${grafcetId}-step-1`, "source:action")
					.target("action", `${grafcetId}-action-1`, "target:step")
					.build(),
			);
		}

		// Step connections
		const stepConnections = [
			new ConnectionBuilder()
				.id(`${grafcetId}-conn-0`)
				.source("step", `${grafcetId}-step-0`, "source:successor")
				.target("transition", `${grafcetId}-trans-0`, "target:predecessor")
				.build(),
			new ConnectionBuilder()
				.id(`${grafcetId}-conn-1`)
				.source("transition", `${grafcetId}-trans-0`, "source:successor")
				.target("step", `${grafcetId}-step-1`, "target:predecessor")
				.build(),
			new ConnectionBuilder()
				.id(`${grafcetId}-conn-2`)
				.source("step", `${grafcetId}-step-1`, "source:successor")
				.target("transition", `${grafcetId}-trans-1`, "target:predecessor")
				.build(),
			new ConnectionBuilder()
				.id(`${grafcetId}-conn-3`)
				.source("transition", `${grafcetId}-trans-1`, "source:successor")
				.target("step", `${grafcetId}-step-0`, "target:predecessor")
				.build(),
		];

		return new GrafcetBuilder()
			.id(grafcetId)
			.name("Cycle with Boolean Actions Grafcet")
			.addSteps(step0, step1)
			.addTransitions(trans0, trans1)
			.addActions(...actions)
			.addConnections(...stepConnections, ...actionConnections)
			.build();
	}

	/**
	 * Creates a 2-step grafcet with numeric variable actions on each step
	 * @param grafcetId ID for the grafcet
	 * @param step0Action Assignment expression for action on step 0 (e.g., "Counter := Counter + 1") - empty string to skip
	 * @param step1Action Assignment expression for action on step 1 - empty string to skip
	 * @param trans0Condition Condition for transition from step0 to step1
	 * @param trans1Condition Condition for transition from step1 to step0
	 * @returns A complete grafcet with steps, transitions, actions, and connections
	 */
	static createCycleWithActions(
		grafcetId: string,
		step0Action: string,
		step1Action: string,
		trans0Condition: string = "VRAI",
		trans1Condition: string = "VRAI",
	): Grafcet {
		const step0 = new StepBuilder()
			.id(`${grafcetId}-step-0`)
			.number(0)
			.initial()
			.position(100, 100)
			.build();

		const step1 = new StepBuilder()
			.id(`${grafcetId}-step-1`)
			.number(1)
			.initial(false)
			.position(100, 200)
			.build();

		const trans0 = new TransitionBuilder()
			.id(`${grafcetId}-trans-0`)
			.expression(trans0Condition)
			.position(100, 150)
			.build();

		const trans1 = new TransitionBuilder()
			.id(`${grafcetId}-trans-1`)
			.expression(trans1Condition)
			.position(100, 250)
			.build();

		const actions = [];
		const actionConnections = [];

		// Only create actions if expressions are not empty
		if (step0Action && step0Action.trim() !== "") {
			const action0 = new ActionBuilder()
				.id(`${grafcetId}-action-0`)
				.expression(step0Action)
				.type(ActionType.NUMERIC_VARIABLE)
				.executionMode(ActionExecutionMode.CONTINUOUS)
				.position(200, 100)
				.build();
			actions.push(action0);
			actionConnections.push(
				new ConnectionBuilder()
					.id(`${grafcetId}-conn-4`)
					.source("step", `${grafcetId}-step-0`, "source:action")
					.target("action", `${grafcetId}-action-0`, "target:step")
					.build(),
			);
		}

		if (step1Action && step1Action.trim() !== "") {
			const action1 = new ActionBuilder()
				.id(`${grafcetId}-action-1`)
				.expression(step1Action)
				.type(ActionType.NUMERIC_VARIABLE)
				.executionMode(ActionExecutionMode.CONTINUOUS)
				.position(200, 200)
				.build();
			actions.push(action1);
			actionConnections.push(
				new ConnectionBuilder()
					.id(`${grafcetId}-conn-5`)
					.source("step", `${grafcetId}-step-1`, "source:action")
					.target("action", `${grafcetId}-action-1`, "target:step")
					.build(),
			);
		}

		// Step connections
		const stepConnections = [
			new ConnectionBuilder()
				.id(`${grafcetId}-conn-0`)
				.source("step", `${grafcetId}-step-0`, "source:successor")
				.target("transition", `${grafcetId}-trans-0`, "target:predecessor")
				.build(),
			new ConnectionBuilder()
				.id(`${grafcetId}-conn-1`)
				.source("transition", `${grafcetId}-trans-0`, "source:successor")
				.target("step", `${grafcetId}-step-1`, "target:predecessor")
				.build(),
			new ConnectionBuilder()
				.id(`${grafcetId}-conn-2`)
				.source("step", `${grafcetId}-step-1`, "source:successor")
				.target("transition", `${grafcetId}-trans-1`, "target:predecessor")
				.build(),
			new ConnectionBuilder()
				.id(`${grafcetId}-conn-3`)
				.source("transition", `${grafcetId}-trans-1`, "source:successor")
				.target("step", `${grafcetId}-step-0`, "target:predecessor")
				.build(),
		];

		return new GrafcetBuilder()
			.id(grafcetId)
			.name("Cycle with Actions Grafcet")
			.addSteps(step0, step1)
			.addTransitions(trans0, trans1)
			.addActions(...actions)
			.addConnections(...stepConnections, ...actionConnections)
			.build();
	}

	/**
	 * Creates a simple linear grafcet with N steps
	 * @param grafcetId ID for the grafcet
	 * @param stepCount Number of steps to create
	 * @param startNumber Starting step number (default 0)
	 * @param transitionCondition Condition for all transitions (default "VRAI")
	 * @param cycle If true, adds a connection back to step 0 (default false)
	 * @returns A linear grafcet
	 */
	static createLinearGrafcet(
		grafcetId: string,
		stepCount: number,
		startNumber: number = 0,
		transitionCondition: string = "VRAI",
		cycle: boolean = false,
	): Grafcet {
		const builder = new GrafcetBuilder().id(grafcetId).name("Linear Grafcet");

		const steps = [];
		const transitions = [];
		const connections = [];

		// Create steps
		for (let i = 0; i < stepCount; i++) {
			const step = new StepBuilder()
				.id(`${grafcetId}-step-${i}`)
				.number(startNumber + i)
				.initial(i === 0)
				.position(100, 100 + i * 100)
				.build();
			steps.push(step);
		}

		// Create transitions and connections
		for (let i = 0; i < stepCount - 1; i++) {
			const trans = new TransitionBuilder()
				.id(`${grafcetId}-trans-${i}`)
				.expression(transitionCondition)
				.position(100, 150 + i * 100)
				.build();
			transitions.push(trans);

			// Connection from step to transition
			connections.push(
				new ConnectionBuilder()
					.id(`${grafcetId}-conn-${i * 2}`)
					.source("step", `${grafcetId}-step-${i}`, "source:successor")
					.target("transition", `${grafcetId}-trans-${i}`, "target:predecessor")
					.build(),
			);

			// Connection from transition to next step
			connections.push(
				new ConnectionBuilder()
					.id(`${grafcetId}-conn-${i * 2 + 1}`)
					.source("transition", `${grafcetId}-trans-${i}`, "source:successor")
					.target("step", `${grafcetId}-step-${i + 1}`, "target:predecessor")
					.build(),
			);
		}

		// Add cycle back if requested
		if (cycle && stepCount > 1) {
			const lastTrans = new TransitionBuilder()
				.id(`${grafcetId}-trans-back`)
				.expression(transitionCondition)
				.position(100, 150 + (stepCount - 1) * 100)
				.build();
			transitions.push(lastTrans);

			connections.push(
				new ConnectionBuilder()
					.id(`${grafcetId}-conn-back-0`)
					.source("step", `${grafcetId}-step-${stepCount - 1}`, "source:successor")
					.target("transition", `${grafcetId}-trans-back`, "target:predecessor")
					.build(),
			);

			connections.push(
				new ConnectionBuilder()
					.id(`${grafcetId}-conn-back-1`)
					.source("transition", `${grafcetId}-trans-back`, "source:successor")
					.target("step", `${grafcetId}-step-0`, "target:predecessor")
					.build(),
			);
		}

		return builder
			.addSteps(...steps)
			.addTransitions(...transitions)
			.addConnections(...connections)
			.build();
	}

	/**
	 * Creates a 3-step grafcet with an OR divergence (junction-or-start / junction-or-end):
	 *
	 *   Step0 (initial)
	 *     └─ JunctionOrStart
	 *          ├─ [branch1Condition] → Step1 (action: branch1Variable CONTINUOUS)
	 *          └─ [branch2Condition] → Step2 (action: branch2Variable CONTINUOUS)
	 *   Step1 ─[VRAI]──┐
	 *   Step2 ─[VRAI]──┤ JunctionOrEnd
	 *                   └──► Step0
	 *
	 * @param grafcetId                 ID for the grafcet
	 * @param branch1Condition          Condition for branch 1 (e.g., "I0")
	 * @param branch2Condition          Condition for branch 2 (e.g., "NON I0")
	 * @param branch1Variable           Variable name for CONTINUOUS action on step1 (empty = no action)
	 * @param branch2Variable           Variable name for CONTINUOUS action on step2 (empty = no action)
	 */
	static createOrDivergenceCycle(
		grafcetId: string,
		branch1Condition: string,
		branch2Condition: string,
		branch1Variable: string = "",
		branch2Variable: string = "",
	): Grafcet {
		// Steps
		const step0 = new StepBuilder()
			.id(`${grafcetId}-step-0`)
			.number(0)
			.initial()
			.position(100, 50)
			.build();
		const step1 = new StepBuilder()
			.id(`${grafcetId}-step-1`)
			.number(1)
			.initial(false)
			.position(0, 250)
			.build();
		const step2 = new StepBuilder()
			.id(`${grafcetId}-step-2`)
			.number(2)
			.initial(false)
			.position(200, 250)
			.build();

		// Junctions
		const jOrStart = new JunctionOrStartBuilder()
			.id(`${grafcetId}-jor-start`)
			.nBranches(2)
			.position(100, 150)
			.build();
		const jOrEnd = new JunctionOrEndBuilder()
			.id(`${grafcetId}-jor-end`)
			.nBranches(2)
			.position(100, 400)
			.build();

		const [jOrStartBranch1, jOrStartBranch2] = jOrStart.data.branchesOrder;
		const [jOrEndBranch1, jOrEndBranch2] = jOrEnd.data.branchesOrder;

		// Transitions
		const trans1 = new TransitionBuilder()
			.id(`${grafcetId}-trans-1`)
			.expression(branch1Condition)
			.position(0, 200)
			.build();
		const trans2 = new TransitionBuilder()
			.id(`${grafcetId}-trans-2`)
			.expression(branch2Condition)
			.position(200, 200)
			.build();
		const trans3 = new TransitionBuilder()
			.id(`${grafcetId}-trans-3`)
			.expression("VRAI")
			.position(0, 350)
			.build();
		const trans4 = new TransitionBuilder()
			.id(`${grafcetId}-trans-4`)
			.expression("VRAI")
			.position(200, 350)
			.build();

		// Connections
		const connections = [
			// Step0 → JunctionOrStart (pivot)
			new ConnectionBuilder()
				.id(`${grafcetId}-c0`)
				.source("step", step0.id, "source:successor")
				.target("junction-or-start", jOrStart.id, "pivot")
				.build(),
			// JunctionOrStart branch1 → Transition1
			new ConnectionBuilder()
				.id(`${grafcetId}-c1`)
				.source("junction-or-start", jOrStart.id, jOrStartBranch1)
				.target("transition", trans1.id, "target:predecessor")
				.build(),
			// JunctionOrStart branch2 → Transition2
			new ConnectionBuilder()
				.id(`${grafcetId}-c2`)
				.source("junction-or-start", jOrStart.id, jOrStartBranch2)
				.target("transition", trans2.id, "target:predecessor")
				.build(),
			// Transition1 → Step1
			new ConnectionBuilder()
				.id(`${grafcetId}-c3`)
				.source("transition", trans1.id, "source:successor")
				.target("step", step1.id, "target:predecessor")
				.build(),
			// Transition2 → Step2
			new ConnectionBuilder()
				.id(`${grafcetId}-c4`)
				.source("transition", trans2.id, "source:successor")
				.target("step", step2.id, "target:predecessor")
				.build(),
			// Step1 → Transition3
			new ConnectionBuilder()
				.id(`${grafcetId}-c5`)
				.source("step", step1.id, "source:successor")
				.target("transition", trans3.id, "target:predecessor")
				.build(),
			// Step2 → Transition4
			new ConnectionBuilder()
				.id(`${grafcetId}-c6`)
				.source("step", step2.id, "source:successor")
				.target("transition", trans4.id, "target:predecessor")
				.build(),
			// Transition3 → JunctionOrEnd branch1
			new ConnectionBuilder()
				.id(`${grafcetId}-c7`)
				.source("transition", trans3.id, "source:successor")
				.target("junction-or-end", jOrEnd.id, jOrEndBranch1)
				.build(),
			// Transition4 → JunctionOrEnd branch2
			new ConnectionBuilder()
				.id(`${grafcetId}-c8`)
				.source("transition", trans4.id, "source:successor")
				.target("junction-or-end", jOrEnd.id, jOrEndBranch2)
				.build(),
			// JunctionOrEnd (pivot) → Step0
			new ConnectionBuilder()
				.id(`${grafcetId}-c9`)
				.source("junction-or-end", jOrEnd.id, "pivot")
				.target("step", step0.id, "target:predecessor")
				.build(),
		];

		// Optional actions
		const actions = [];
		const actionConnections = [];
		if (branch1Variable.trim() !== "") {
			const action1 = new ActionBuilder()
				.id(`${grafcetId}-action-1`)
				.expression(branch1Variable)
				.type(ActionType.BOOLEAN_VARIABLE)
				.executionMode(ActionExecutionMode.CONTINUOUS)
				.position(0, 250)
				.build();
			actions.push(action1);
			actionConnections.push(
				new ConnectionBuilder()
					.id(`${grafcetId}-ca1`)
					.source("step", step1.id, "source:action")
					.target("action", action1.id, "target:step")
					.build(),
			);
		}
		if (branch2Variable.trim() !== "") {
			const action2 = new ActionBuilder()
				.id(`${grafcetId}-action-2`)
				.expression(branch2Variable)
				.type(ActionType.BOOLEAN_VARIABLE)
				.executionMode(ActionExecutionMode.CONTINUOUS)
				.position(200, 250)
				.build();
			actions.push(action2);
			actionConnections.push(
				new ConnectionBuilder()
					.id(`${grafcetId}-ca2`)
					.source("step", step2.id, "source:action")
					.target("action", action2.id, "target:step")
					.build(),
			);
		}

		return new GrafcetBuilder()
			.id(grafcetId)
			.name("OR Divergence Grafcet")
			.addSteps(step0, step1, step2)
			.addTransitions(trans1, trans2, trans3, trans4)
			.addJunctionOrStart(jOrStart)
			.addJunctionOrEnd(jOrEnd)
			.addActions(...actions)
			.addConnections(...connections, ...actionConnections)
			.build();
	}

	/**
	 * Creates a simple 2-step grafcet with a numeric variable action on step1.
	 *
	 *   Step0 (initial) ─[VRAI]→ Step1 (CONTINUOUS numeric action) ─[VRAI]→ Step0
	 *
	 * @param grafcetId     ID for the grafcet
	 * @param actionExpr    Numeric expression for the action on step1 (e.g., "Counter := Counter + 1")
	 * @param mode          Execution mode for the action (default: CONTINUOUS)
	 */
	static createNumericActionCycle(
		grafcetId: string,
		actionExpr: string,
		mode: ActionExecutionMode = ActionExecutionMode.CONTINUOUS,
	): Grafcet {
		const step0 = new StepBuilder()
			.id(`${grafcetId}-step-0`)
			.number(0)
			.initial()
			.position(100, 100)
			.build();
		const step1 = new StepBuilder()
			.id(`${grafcetId}-step-1`)
			.number(1)
			.initial(false)
			.position(100, 200)
			.build();

		const trans0 = new TransitionBuilder()
			.id(`${grafcetId}-trans-0`)
			.expression("VRAI")
			.position(100, 150)
			.build();
		const trans1 = new TransitionBuilder()
			.id(`${grafcetId}-trans-1`)
			.expression("VRAI")
			.position(100, 250)
			.build();

		const action = new ActionBuilder()
			.id(`${grafcetId}-action-0`)
			.expression(actionExpr)
			.type(ActionType.NUMERIC_VARIABLE)
			.executionMode(mode)
			.position(200, 200)
			.build();

		const connections = [
			new ConnectionBuilder()
				.id(`${grafcetId}-c0`)
				.source("step", step0.id, "source:successor")
				.target("transition", trans0.id, "target:predecessor")
				.build(),
			new ConnectionBuilder()
				.id(`${grafcetId}-c1`)
				.source("transition", trans0.id, "source:successor")
				.target("step", step1.id, "target:predecessor")
				.build(),
			new ConnectionBuilder()
				.id(`${grafcetId}-c2`)
				.source("step", step1.id, "source:successor")
				.target("transition", trans1.id, "target:predecessor")
				.build(),
			new ConnectionBuilder()
				.id(`${grafcetId}-c3`)
				.source("transition", trans1.id, "source:successor")
				.target("step", step0.id, "target:predecessor")
				.build(),
			new ConnectionBuilder()
				.id(`${grafcetId}-ca0`)
				.source("step", step1.id, "source:action")
				.target("action", action.id, "target:step")
				.build(),
		];

		return new GrafcetBuilder()
			.id(grafcetId)
			.name("Numeric Action Cycle Grafcet")
			.addSteps(step0, step1)
			.addTransitions(trans0, trans1)
			.addActions(action)
			.addConnections(...connections)
			.build();
	}

	/**
	 * Creates a 3-step grafcet with an AND divergence (junction-and-start / junction-and-end):
	 *
	 *   Step0 (initial)
	 *     └─ [divCondition] → JunctionAndStart
	 *          ├─ branch1 → Step1  (action: branch1Variable CONTINUOUS)
	 *          └─ branch2 → Step2  (action: branch2Variable CONTINUOUS)
	 *   Step1 ─source:successor─┐
	 *   Step2 ─source:successor─┤ JunctionAndEnd (both must be active)
	 *                            └─ [convCondition] → Step0
	 *
	 * Topology:
	 *   transition(source:successor) → junction-and-start(target:pivot)
	 *   junction-and-start(source:branch) → step(target:predecessor)
	 *   step(source:successor)  → junction-and-end(target:branch)
	 *   junction-and-end(source:pivot) → transition(target:predecessor)
	 *
	 * @param grafcetId       ID for the grafcet
	 * @param divCondition    Condition for the divergence transition (e.g. "I0")
	 * @param convCondition   Condition for the convergence transition (e.g. "NON I0")
	 * @param branch1Variable Variable name for CONTINUOUS action on step1 (empty = no action)
	 * @param branch2Variable Variable name for CONTINUOUS action on step2 (empty = no action)
	 */
	static createAndDivergenceCycle(
		grafcetId: string,
		divCondition: string,
		convCondition: string,
		branch1Variable: string = "",
		branch2Variable: string = "",
	): Grafcet {
		// Steps
		const step0 = new StepBuilder()
			.id(`${grafcetId}-step-0`)
			.number(0)
			.initial()
			.position(100, 50)
			.build();
		const step1 = new StepBuilder()
			.id(`${grafcetId}-step-1`)
			.number(1)
			.initial(false)
			.position(0, 300)
			.build();
		const step2 = new StepBuilder()
			.id(`${grafcetId}-step-2`)
			.number(2)
			.initial(false)
			.position(200, 300)
			.build();

		// Transitions
		const transDivergence = new TransitionBuilder()
			.id(`${grafcetId}-trans-div`)
			.expression(divCondition)
			.position(100, 150)
			.build();
		const transConvergence = new TransitionBuilder()
			.id(`${grafcetId}-trans-conv`)
			.expression(convCondition)
			.position(100, 450)
			.build();

		// Junctions
		const jAndStart = new JunctionAndStartBuilder()
			.id(`${grafcetId}-jand-start`)
			.nBranches(2)
			.position(100, 200)
			.build();
		const jAndEnd = new JunctionAndEndBuilder()
			.id(`${grafcetId}-jand-end`)
			.nBranches(2)
			.position(100, 400)
			.build();

		const [jAndStartBranch1, jAndStartBranch2] = jAndStart.data.branchesOrder;
		const [jAndEndBranch1, jAndEndBranch2] = jAndEnd.data.branchesOrder;

		// Connections
		const connections = [
			// Step0 → TransDivergence
			new ConnectionBuilder()
				.id(`${grafcetId}-c0`)
				.source("step", step0.id, "source:successor")
				.target("transition", transDivergence.id, "target:predecessor")
				.build(),
			// TransDivergence → JunctionAndStart (pivot)
			new ConnectionBuilder()
				.id(`${grafcetId}-c1`)
				.source("transition", transDivergence.id, "source:successor")
				.target("junction-and-start", jAndStart.id, "pivot")
				.build(),
			// JunctionAndStart branch1 → Step1
			new ConnectionBuilder()
				.id(`${grafcetId}-c2`)
				.source("junction-and-start", jAndStart.id, jAndStartBranch1)
				.target("step", step1.id, "target:predecessor")
				.build(),
			// JunctionAndStart branch2 → Step2
			new ConnectionBuilder()
				.id(`${grafcetId}-c3`)
				.source("junction-and-start", jAndStart.id, jAndStartBranch2)
				.target("step", step2.id, "target:predecessor")
				.build(),
			// Step1 → JunctionAndEnd branch1
			new ConnectionBuilder()
				.id(`${grafcetId}-c4`)
				.source("step", step1.id, "source:successor")
				.target("junction-and-end", jAndEnd.id, jAndEndBranch1)
				.build(),
			// Step2 → JunctionAndEnd branch2
			new ConnectionBuilder()
				.id(`${grafcetId}-c5`)
				.source("step", step2.id, "source:successor")
				.target("junction-and-end", jAndEnd.id, jAndEndBranch2)
				.build(),
			// JunctionAndEnd (pivot) → TransConvergence
			new ConnectionBuilder()
				.id(`${grafcetId}-c6`)
				.source("junction-and-end", jAndEnd.id, "pivot")
				.target("transition", transConvergence.id, "target:predecessor")
				.build(),
			// TransConvergence → Step0
			new ConnectionBuilder()
				.id(`${grafcetId}-c7`)
				.source("transition", transConvergence.id, "source:successor")
				.target("step", step0.id, "target:predecessor")
				.build(),
		];

		// Optional actions
		const actions = [];
		const actionConnections = [];
		if (branch1Variable.trim() !== "") {
			const action1 = new ActionBuilder()
				.id(`${grafcetId}-action-1`)
				.expression(branch1Variable)
				.type(ActionType.BOOLEAN_VARIABLE)
				.executionMode(ActionExecutionMode.CONTINUOUS)
				.position(0, 300)
				.build();
			actions.push(action1);
			actionConnections.push(
				new ConnectionBuilder()
					.id(`${grafcetId}-ca1`)
					.source("step", step1.id, "source:action")
					.target("action", action1.id, "target:step")
					.build(),
			);
		}
		if (branch2Variable.trim() !== "") {
			const action2 = new ActionBuilder()
				.id(`${grafcetId}-action-2`)
				.expression(branch2Variable)
				.type(ActionType.BOOLEAN_VARIABLE)
				.executionMode(ActionExecutionMode.CONTINUOUS)
				.position(200, 300)
				.build();
			actions.push(action2);
			actionConnections.push(
				new ConnectionBuilder()
					.id(`${grafcetId}-ca2`)
					.source("step", step2.id, "source:action")
					.target("action", action2.id, "target:step")
					.build(),
			);
		}

		return new GrafcetBuilder()
			.id(grafcetId)
			.name("AND Divergence Grafcet")
			.addSteps(step0, step1, step2)
			.addTransitions(transDivergence, transConvergence)
			.addJunctionAndStart(jAndStart)
			.addJunctionAndEnd(jAndEnd)
			.addActions(...actions)
			.addConnections(...connections, ...actionConnections)
			.build();
	}
}
