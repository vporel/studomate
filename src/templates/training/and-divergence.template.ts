import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import JunctionAndEndBuilder from "@/schemas/grafcet/builders/junction-and-end.builder";
import JunctionAndStartBuilder from "@/schemas/grafcet/builders/junction-and-start.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import StepReferralSourceBuilder from "@/schemas/grafcet/builders/step-referral-source.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import {
	ActionExecutionMode,
	ActionType,
	ACTION_HANDLE_TARGET_STEP,
} from "@/schemas/grafcet/action.schema";
import { JUNCTION_HANDLE_PIVOT } from "@/schemas/grafcet/junction.schema";
import { STEP_REFERRAL_SOURCE_HANDLE_TARGET_PREDECESSOR } from "@/schemas/grafcet/step-referral-source.schema";
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
 * Creates a pre-configured "AND divergence" project: boolean input/output variables, no
 * program (the student writes it). Training module mini-exercise (M1): a single AND
 * divergence (two parallel branches) closed by its convergence, no other complexity (no
 * timer, no nesting).
 */
export function createAndDivergenceProject(): Project {
	const project = new Project(createRandomId(), "Divergence en ET", "");

	project.variables.push(
		VariableBuilder.buildLogicInput(createRandomId(), "dcy"),
		VariableBuilder.buildLogicInput(createRandomId(), "capteur1"),
		VariableBuilder.buildLogicInput(createRandomId(), "capteur2"),
		VariableBuilder.buildLogicOutput(createRandomId(), "sortie1"),
		VariableBuilder.buildLogicOutput(createRandomId(), "sortie2"),
	);

	return project;
}

/**
 * Full, simulable version: a GRAFCET with a source step, an AND divergence into two parallel
 * steps (one output each), and an AND convergence that only allows continuing once both
 * branches are done.
 *
 * Sequence: E0 (initial) --dcy--> ⋀ (E1 sortie1 ∥ E2 sortie2) ⋀ --capteur1 ET capteur2--> E0
 */
export function createAndDivergenceSolution(): Project {
	const project = createAndDivergenceProject();
	project.name = "Divergence en ET — solution";

	const XL = 140;
	const XR = 340;
	const XC = (XL + XR) / 2;

	const e0 = new StepBuilder()
		.id(createRandomId())
		.number(0)
		.initial()
		.position(XC - 20, 40)
		.build();
	const t0 = new TransitionBuilder()
		.id(createRandomId())
		.expression("dcy")
		.position(XC - 20, 100)
		.build();

	// Barres de divergence/convergence dimensionnées pour que chaque branche tombe droit sur
	// l'étape correspondante (offsets alignés sur les centres de e1/e2) et que le pivot soit
	// sous/sur l'axe de t0/t1 — même pattern que `parking.template.ts`.
	const andStart = new JunctionAndStartBuilder()
		.id(createRandomId())
		.dimensions(XR - XL + 40, 30)
		.branchesPositions(20, XR - XL + 20)
		.pivotPosition(XC - XL)
		.position(XL, 140)
		.build();
	const [branch1In, branch2In] = andStart.data.branchesOrder;

	const e1 = new StepBuilder().id(createRandomId()).number(1).position(XL, 190).build();
	const e2 = new StepBuilder().id(createRandomId()).number(2).position(XR, 190).build();

	const andEnd = new JunctionAndEndBuilder()
		.id(createRandomId())
		.dimensions(XR - XL + 40, 30)
		.branchesPositions(20, XR - XL + 20)
		.pivotPosition(XC - XL)
		.position(XL, 260)
		.build();
	const [branch1Out, branch2Out] = andEnd.data.branchesOrder;

	const t1 = new TransitionBuilder()
		.id(createRandomId())
		.expression("capteur1 ET capteur2")
		.position(XC - 20, 310)
		.build();

	const a1 = new ActionBuilder()
		.id(createRandomId())
		.expression("sortie1")
		.type(ActionType.BOOLEAN_VARIABLE)
		.executionMode(ActionExecutionMode.CONTINUOUS)
		.position(XL + 80, 190)
		.build();
	const a2 = new ActionBuilder()
		.id(createRandomId())
		.expression("sortie2")
		.type(ActionType.BOOLEAN_VARIABLE)
		.executionMode(ActionExecutionMode.CONTINUOUS)
		.position(XR + 80, 190)
		.build();

	// Retour sur l'étape 0 par un renvoi d'étape (=0) plutôt qu'une connexion de retour, pour
	// éviter un long fil traversant les jonctions — même pattern que `parking.template.ts`.
	const renvoi = new StepReferralSourceBuilder()
		.id(createRandomId())
		.targetStepNumber(0)
		.position(XC - 20, 360)
		.build();

	const grafcet = new GrafcetBuilder()
		.id(createRandomId())
		.name("Divergence en ET")
		.addSteps(e0, e1, e2)
		.addTransitions(t0, t1)
		.addStepReferralsSources(renvoi)
		.addJunctionAndStart(andStart)
		.addJunctionAndEnd(andEnd)
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
				andStart,
				JUNCTION_HANDLE_PIVOT,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				andStart,
				branch1In,
				e1,
				STEP_HANDLE_TARGET_PREDECESSOR,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				andStart,
				branch2In,
				e2,
				STEP_HANDLE_TARGET_PREDECESSOR,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				e1,
				STEP_HANDLE_SOURCE_SUCCESSOR,
				andEnd,
				branch1Out,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				e2,
				STEP_HANDLE_SOURCE_SUCCESSOR,
				andEnd,
				branch2Out,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				andEnd,
				JUNCTION_HANDLE_PIVOT,
				t1,
				TRANSITION_HANDLE_TARGET_PREDECESSOR,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				t1,
				TRANSITION_HANDLE_SOURCE_SUCCESSOR,
				renvoi,
				STEP_REFERRAL_SOURCE_HANDLE_TARGET_PREDECESSOR,
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
