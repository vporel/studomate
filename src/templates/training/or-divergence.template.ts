import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import JunctionOrStartBuilder from "@/schemas/grafcet/builders/junction-or-start.builder";
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
 * Creates a pre-configured "OR divergence" project: boolean input/output variables, no
 * program (the student writes it). Training module mini-exercise (M1): a single OR
 * divergence (two mutually exclusive branches), each looping back to the initial step
 * independently, no other complexity (no timer, no nesting).
 */
export function createOrDivergenceProject(): Project {
	const project = new Project(createRandomId(), "Divergence en OU", "");

	project.variables.push(
		VariableBuilder.buildLogicInput(createRandomId(), "dcy1"),
		VariableBuilder.buildLogicInput(createRandomId(), "dcy2"),
		VariableBuilder.buildLogicInput(createRandomId(), "fin1"),
		VariableBuilder.buildLogicInput(createRandomId(), "fin2"),
		VariableBuilder.buildLogicOutput(createRandomId(), "sortie1"),
		VariableBuilder.buildLogicOutput(createRandomId(), "sortie2"),
	);

	return project;
}

/**
 * Full, simulable version: a GRAFCET with an initial step, an OR divergence into two
 * exclusive branches, each looping back to the initial step on its own end condition.
 *
 * Sequence: E0 (initial) --dcy1--> E1 (sortie1) --fin1--> E0
 *                         --dcy2--> E2 (sortie2) --fin2--> E0
 */
export function createOrDivergenceSolution(): Project {
	const project = createOrDivergenceProject();
	project.name = "Divergence en OU — solution";

	const XL = 140;
	const XR = 340;
	const XC = (XL + XR) / 2;

	const e0 = new StepBuilder()
		.id(createRandomId())
		.number(0)
		.initial()
		.position(XC - 20, 40)
		.build();

	// Barre de divergence dimensionnée pour que chaque branche tombe droit sur sa transition
	// aval (offsets alignés sur les centres de t01/t02) et que le pivot soit sous l'étape 0 —
	// même pattern que `parking.template.ts`.
	const orStart = new JunctionOrStartBuilder()
		.id(createRandomId())
		.dimensions(XR - XL + 40, 30)
		.branchesPositions(20, XR - XL + 20)
		.pivotPosition(XC - XL)
		.position(XL, 100)
		.build();
	const [branch1In, branch2In] = orStart.data.branchesOrder;

	const t01 = new TransitionBuilder()
		.id(createRandomId())
		.expression("dcy1")
		.position(XL, 160)
		.build();
	const t02 = new TransitionBuilder()
		.id(createRandomId())
		.expression("dcy2")
		.position(XR, 160)
		.build();

	const e1 = new StepBuilder().id(createRandomId()).number(1).position(XL, 220).build();
	const e2 = new StepBuilder().id(createRandomId()).number(2).position(XR, 220).build();

	const t1 = new TransitionBuilder()
		.id(createRandomId())
		.expression("fin1")
		.position(XL, 290)
		.build();
	const t2 = new TransitionBuilder()
		.id(createRandomId())
		.expression("fin2")
		.position(XR, 290)
		.build();

	const a1 = new ActionBuilder()
		.id(createRandomId())
		.expression("sortie1")
		.type(ActionType.BOOLEAN_VARIABLE)
		.executionMode(ActionExecutionMode.CONTINUOUS)
		.position(XL + 80, 220)
		.build();
	const a2 = new ActionBuilder()
		.id(createRandomId())
		.expression("sortie2")
		.type(ActionType.BOOLEAN_VARIABLE)
		.executionMode(ActionExecutionMode.CONTINUOUS)
		.position(XR + 80, 220)
		.build();

	// Chaque branche reboucle sur l'étape 0 par un renvoi d'étape (=0) plutôt qu'une connexion
	// de retour, pour éviter un long fil traversant tout le schéma — même pattern que
	// `parking.template.ts`.
	const renvoi1 = new StepReferralSourceBuilder()
		.id(createRandomId())
		.targetStepNumber(0)
		.position(XL, 350)
		.build();
	const renvoi2 = new StepReferralSourceBuilder()
		.id(createRandomId())
		.targetStepNumber(0)
		.position(XR, 350)
		.build();

	const grafcet = new GrafcetBuilder()
		.id(createRandomId())
		.name("Divergence en OU")
		.addSteps(e0, e1, e2)
		.addTransitions(t01, t02, t1, t2)
		.addJunctionOrStart(orStart)
		.addActions(a1, a2)
		.addStepReferralsSources(renvoi1, renvoi2)
		.addConnections(
			ConnectionBuilder.betweenElements(
				createRandomId(),
				e0,
				STEP_HANDLE_SOURCE_SUCCESSOR,
				orStart,
				JUNCTION_HANDLE_PIVOT,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				orStart,
				branch1In,
				t01,
				TRANSITION_HANDLE_TARGET_PREDECESSOR,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				orStart,
				branch2In,
				t02,
				TRANSITION_HANDLE_TARGET_PREDECESSOR,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				t01,
				TRANSITION_HANDLE_SOURCE_SUCCESSOR,
				e1,
				STEP_HANDLE_TARGET_PREDECESSOR,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				t02,
				TRANSITION_HANDLE_SOURCE_SUCCESSOR,
				e2,
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
				e2,
				STEP_HANDLE_SOURCE_SUCCESSOR,
				t2,
				TRANSITION_HANDLE_TARGET_PREDECESSOR,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				t1,
				TRANSITION_HANDLE_SOURCE_SUCCESSOR,
				renvoi1,
				STEP_REFERRAL_SOURCE_HANDLE_TARGET_PREDECESSOR,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				t2,
				TRANSITION_HANDLE_SOURCE_SUCCESSOR,
				renvoi2,
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
