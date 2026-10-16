import CartonSortingDescriptor from "@/3d-scenes/carton-sorting/v1/carton-sorting.descriptor";
import { createRandomId } from "@/ids";
import {
	ACTION_HANDLE_TARGET_STEP,
	ActionExecutionMode,
	ActionType,
} from "@/schemas/grafcet/action.schema";
import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import JunctionOrEndBuilder from "@/schemas/grafcet/builders/junction-or-end.builder";
import JunctionOrStartBuilder from "@/schemas/grafcet/builders/junction-or-start.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import StepReferralSourceBuilder from "@/schemas/grafcet/builders/step-referral-source.builder";
import StepReferralTargetBuilder from "@/schemas/grafcet/builders/step-referral-target.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import { JUNCTION_HANDLE_PIVOT } from "@/schemas/grafcet/junction.schema";
import { STEP_REFERRAL_SOURCE_HANDLE_TARGET_PREDECESSOR } from "@/schemas/grafcet/step-referral-source.schema";
import { STEP_REFERRAL_TARGET_HANDLE_SOURCE_SUCCESSOR } from "@/schemas/grafcet/step-referral-target.schema";
import {
	STEP_HANDLE_SOURCE_ACTION,
	STEP_HANDLE_SOURCE_SUCCESSOR,
	STEP_HANDLE_TARGET_PREDECESSOR,
} from "@/schemas/grafcet/step.schema";
import {
	TRANSITION_HANDLE_SOURCE_SUCCESSOR,
	TRANSITION_HANDLE_TARGET_PREDECESSOR,
} from "@/schemas/grafcet/transition.schema";
import Project from "@/schemas/project/project.schema";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";

/**
 * Crée un projet "Poste de tri de caisses" pré-configuré :
 * — sorties : `Cmd_T1`, `Cmd_T2T3`, `Cmd_Px_out` / `Cmd_Px_in` (vérins P1/P2/P3)
 * — entrées : `dcy` (départ cycle) et capteurs `cpt_*`, pilotés par la scène 3D « Tri de caisses »
 * — compteur `C` en mémoire, affiché sur le pupitre de la scène 3D
 * — scène 3D câblée sur les sorties, les entrées et le compteur : elle joue la partie opérative
 *   et porte le pupitre (départ cycle, compteur) et l'arrivée des caisses
 * — pas de GRAFCET de commande : c'est ce que l'étudiant écrit
 */
export function createCartonSortingProject(): Project {
	const project = new Project(createRandomId(), "Poste de tri de caisses", "");

	const sensors = CartonSortingDescriptor.points
		.filter((point) => point.kind === "sensor")
		.map((point) =>
			VariableBuilder.buildLogicInput(
				createRandomId(),
				point.suggestedMnemonic,
			),
		);
	const outputs = CartonSortingDescriptor.points
		.filter((point) => point.kind === "actuator")
		.map((point) =>
			VariableBuilder.buildLogicOutput(
				createRandomId(),
				point.suggestedMnemonic,
			),
		);
	const startCycle = sensors.find((sensor) => sensor.mnemonic === "dcy")!;
	project.variables.push(
		startCycle,
		...outputs,
		...sensors.filter((sensor) => sensor !== startCycle),
	);
	const counter = VariableBuilder.buildMemoryInt(createRandomId(), "C");
	counter.comment = "compteur de caisses triées";
	project.variables.push(counter);

	const variableIdByMnemonic = new Map(
		project.variables.map((variable) => [variable.mnemonic, variable.id]),
	);
	project.scene3d = {
		sceneId: CartonSortingDescriptor.id,
		sceneVersion: CartonSortingDescriptor.version,
		bindings: Object.fromEntries(
			CartonSortingDescriptor.points.map((point) => [
				point.id,
				variableIdByMnemonic.get(point.suggestedMnemonic)!,
			]),
		),
	};

	return project;
}

/**
 * Version complète et simulable du poste de tri.
 *
 * GRAFCET "Commande" :
 *   X0 (initial, `Cmd_T2T3` reset, `C := 0`) ─[dcy]→ X1 (`Cmd_T2T3` set, `Cmd_T1`)
 *   X1 ─OU─ [cpt_psce_c ET NON cpt_c_hte] → X11→X12→X13 (P1 sort, puis P2 quand la caisse est
 *          en P2 : `cpt_psce_p2`)
 *          [cpt_psce_c ET cpt_c_hte]      → X21→X22→X23 (P1 sort, puis P3 quand la caisse est
 *          en P3 : `cpt_psce_p3`)
 *      convergence → X4 (`Cmd_P1_in`, `C := C + 1`)
 *   X4 ─OU─ [C < 2 ET cpt_p1_in]  → X5 ─[VRAI]→ renvoi vers X1
 *          [C >= 2 ET cpt_p1_in]  → X6 ─[VRAI]→ renvoi vers X0
 *
 * Les capteurs proviennent de la scène 3D : après `dcy` puis chaque appui sur « Nouvelle
 * caisse » dans la scène, le tri se déroule sans autre intervention.
 */
export function createCartonSortingSolution(): Project {
	const project = createCartonSortingProject();
	project.name = "Poste de tri de caisses — solution";

	// Coordonnées « bord gauche » (comme les autres templates) ; le centre d'un élément est à
	// `x + 20`. `GX` est l'axe central du grafcet, `XL` / `XR` les axes des deux branches.
	const GX = 240;
	const XL = 40;
	const XR = 440;
	const ROW = 58;
	const juWidth = XR - XL + 40;
	const juBranches: [number, number] = [20, XR - XL + 20];
	const juPivot = GX - XL;

	const step = (n: number, x: number, y: number, initial = false) => {
		const b = new StepBuilder().id(createRandomId()).number(n).position(x, y);
		if (initial) b.initial();
		return b.build();
	};
	const trans = (expression: string, x: number, y: number) =>
		new TransitionBuilder()
			.id(createRandomId())
			.expression(expression)
			.position(x, y)
			.build();
	const orStart = (y: number) =>
		new JunctionOrStartBuilder()
			.id(createRandomId())
			.nBranches(2)
			.dimensions(juWidth, 30)
			.branchesPositions(...juBranches)
			.pivotPosition(juPivot)
			.position(XL, y)
			.build();
	const orEnd = (y: number) =>
		new JunctionOrEndBuilder()
			.id(createRandomId())
			.nBranches(2)
			.dimensions(juWidth, 30)
			.branchesPositions(...juBranches)
			.pivotPosition(juPivot)
			.position(XL, y)
			.build();
	const boolAction = (
		expression: string,
		x: number,
		y: number,
		mode: ActionExecutionMode = ActionExecutionMode.CONTINUOUS,
	) =>
		new ActionBuilder()
			.id(createRandomId())
			.expression(expression)
			.type(ActionType.BOOLEAN_VARIABLE)
			.executionMode(mode)
			.position(x, y)
			.build();
	const numAction = (
		expression: string,
		x: number,
		y: number,
		mode: ActionExecutionMode,
	) =>
		new ActionBuilder()
			.id(createRandomId())
			.expression(expression)
			.type(ActionType.NUMERIC_VARIABLE)
			.executionMode(mode)
			.width(120)
			.position(x, y)
			.build();

	const CL = GX - 20;
	// Décalage de la 1ʳᵉ action par rapport à l'étape, puis de la 2ᵉ (accolée à la 1ʳᵉ,
	// largeur d'action par défaut = 100).
	const A1 = 60;
	const A2 = A1 + 100;
	const e0 = step(0, CL, ROW, true);
	const t0 = trans("dcy", CL, ROW * 2);
	const e1 = step(1, CL, ROW * 3);
	const div1 = orStart(ROW * 4);
	const tLow = trans("cpt_psce_c ET NON cpt_c_hte", XL, ROW * 5);
	const tHigh = trans("cpt_psce_c ET cpt_c_hte", XR, ROW * 5);
	const e11 = step(11, XL, ROW * 6);
	const e21 = step(21, XR, ROW * 6);
	const t1112 = trans("cpt_psce_p2", XL, ROW * 7);
	const t2122 = trans("cpt_psce_p3", XR, ROW * 7);
	const e12 = step(12, XL, ROW * 8);
	const e22 = step(22, XR, ROW * 8);
	const t1213 = trans("cpt_p2_out", XL, ROW * 9);
	const t2223 = trans("cpt_p3_out", XR, ROW * 9);
	const e13 = step(13, XL, ROW * 10);
	const e23 = step(23, XR, ROW * 10);
	const t13c = trans("cpt_p2_in", XL, ROW * 11);
	const t23c = trans("cpt_p3_in", XR, ROW * 11);
	const conv1 = orEnd(ROW * 12);
	const e4 = step(4, CL, ROW * 13);
	const div2 = orStart(ROW * 14);
	const tLt2 = trans("C < 2 ET cpt_p1_in", XL, ROW * 15);
	const tGte2 = trans("C >= 2 ET cpt_p1_in", XR, ROW * 15);
	const e5 = step(5, XL, ROW * 16);
	const e6 = step(6, XR, ROW * 16);
	const tBack1 = trans("VRAI", XL, ROW * 17);
	const tBack0 = trans("VRAI", XR, ROW * 17);
	const backTo1Source = new StepReferralSourceBuilder()
		.id(createRandomId())
		.targetStepNumber(1)
		.position(XL, ROW * 18)
		.build();
	const backTo0Source = new StepReferralSourceBuilder()
		.id(createRandomId())
		.targetStepNumber(0)
		.position(XR, ROW * 18)
		.build();
	const from5Target = new StepReferralTargetBuilder()
		.id(createRandomId())
		.sourceStepNumber(5)
		.position(CL - 130, ROW * 2)
		.build();
	const from6Target = new StepReferralTargetBuilder()
		.id(createRandomId())
		.sourceStepNumber(6)
		.position(CL, 0)
		.build();

	const aResetT2T3 = boolAction(
		"Cmd_T2T3",
		CL + A1,
		ROW,
		ActionExecutionMode.RESET,
	);
	const aInitC = numAction(
		"C := 0",
		CL + A2,
		ROW,
		ActionExecutionMode.CONTINUOUS,
	);
	const aSetT2T3 = boolAction(
		"Cmd_T2T3",
		CL + A1,
		ROW * 3,
		ActionExecutionMode.SET,
	);
	const aT1 = boolAction("Cmd_T1", CL + A2, ROW * 3);
	const aP1o11 = boolAction("Cmd_P1_out", XL + A1, ROW * 6);
	const aP2o = boolAction("Cmd_P2_out", XL + A1, ROW * 8);
	const aP1i12 = boolAction("Cmd_P1_in", XL + A2, ROW * 8);
	const aP2i = boolAction("Cmd_P2_in", XL + A1, ROW * 10);
	const aP1i13 = boolAction("Cmd_P1_in", XL + A2, ROW * 10);
	const aP1o21 = boolAction("Cmd_P1_out", XR + A1, ROW * 6);
	const aP3o = boolAction("Cmd_P3_out", XR + A1, ROW * 8);
	const aP1i22 = boolAction("Cmd_P1_in", XR + A2, ROW * 8);
	const aP3i = boolAction("Cmd_P3_in", XR + A1, ROW * 10);
	const aP1i23 = boolAction("Cmd_P1_in", XR + A2, ROW * 10);
	const aP1i4 = boolAction("Cmd_P1_in", CL + A1, ROW * 13);
	const aIncC = numAction(
		"C := C + 1",
		CL + A2,
		ROW * 13,
		ActionExecutionMode.RISING_EDGE,
	);

	const [d1a, d1b] = div1.data.branchesOrder;
	const [c1a, c1b] = conv1.data.branchesOrder;
	const [d2a, d2b] = div2.data.branchesOrder;

	type El = ReturnType<typeof step> | ReturnType<typeof trans>;
	const linkSeq = (src: El, tgt: El) =>
		ConnectionBuilder.betweenElements(
			createRandomId(),
			src,
			src.type === "step"
				? STEP_HANDLE_SOURCE_SUCCESSOR
				: TRANSITION_HANDLE_SOURCE_SUCCESSOR,
			tgt,
			tgt.type === "step"
				? STEP_HANDLE_TARGET_PREDECESSOR
				: TRANSITION_HANDLE_TARGET_PREDECESSOR,
		);
	const linkAction = (
		s: ReturnType<typeof step>,
		a: ReturnType<typeof boolAction>,
	) =>
		ConnectionBuilder.betweenElements(
			createRandomId(),
			s,
			STEP_HANDLE_SOURCE_ACTION,
			a,
			ACTION_HANDLE_TARGET_STEP,
		);
	const stepToJunction = (
		s: ReturnType<typeof step>,
		j: ReturnType<typeof orStart>,
	) =>
		ConnectionBuilder.betweenElements(
			createRandomId(),
			s,
			STEP_HANDLE_SOURCE_SUCCESSOR,
			j,
			JUNCTION_HANDLE_PIVOT,
		);
	const junctionToTransition = (
		j: ReturnType<typeof orStart>,
		branch: string,
		t: ReturnType<typeof trans>,
	) =>
		ConnectionBuilder.betweenElements(
			createRandomId(),
			j,
			branch,
			t,
			TRANSITION_HANDLE_TARGET_PREDECESSOR,
		);
	const transitionToJunction = (
		t: ReturnType<typeof trans>,
		j: ReturnType<typeof orEnd>,
		branch: string,
	) =>
		ConnectionBuilder.betweenElements(
			createRandomId(),
			t,
			TRANSITION_HANDLE_SOURCE_SUCCESSOR,
			j,
			branch,
		);
	const junctionToStep = (
		j: ReturnType<typeof orEnd>,
		s: ReturnType<typeof step>,
	) =>
		ConnectionBuilder.betweenElements(
			createRandomId(),
			j,
			JUNCTION_HANDLE_PIVOT,
			s,
			STEP_HANDLE_TARGET_PREDECESSOR,
		);

	const commande = new GrafcetBuilder()
		.id(createRandomId())
		.name("Commande")
		.addSteps(e0, e1, e11, e12, e13, e21, e22, e23, e4, e5, e6)
		.addTransitions(
			t0,
			tLow,
			tHigh,
			t1112,
			t1213,
			t13c,
			t2122,
			t2223,
			t23c,
			tLt2,
			tGte2,
			tBack1,
			tBack0,
		)
		.addJunctionsOrStarts(div1, div2)
		.addJunctionsOrEnds(conv1)
		.addStepReferralsSources(backTo1Source, backTo0Source)
		.addStepReferralsTargets(from5Target, from6Target)
		.addActions(
			aResetT2T3,
			aInitC,
			aSetT2T3,
			aT1,
			aP1o11,
			aP2o,
			aP1i12,
			aP2i,
			aP1i13,
			aP1o21,
			aP3o,
			aP1i22,
			aP3i,
			aP1i23,
			aP1i4,
			aIncC,
		)
		.addConnections(
			linkSeq(e0, t0),
			linkSeq(t0, e1),
			stepToJunction(e1, div1),
			junctionToTransition(div1, d1a, tLow),
			junctionToTransition(div1, d1b, tHigh),
			linkSeq(tLow, e11),
			linkSeq(tHigh, e21),
			linkSeq(e11, t1112),
			linkSeq(t1112, e12),
			linkSeq(e12, t1213),
			linkSeq(t1213, e13),
			linkSeq(e13, t13c),
			linkSeq(e21, t2122),
			linkSeq(t2122, e22),
			linkSeq(e22, t2223),
			linkSeq(t2223, e23),
			linkSeq(e23, t23c),
			transitionToJunction(t13c, conv1, c1a),
			transitionToJunction(t23c, conv1, c1b),
			junctionToStep(conv1, e4),
			stepToJunction(e4, div2),
			junctionToTransition(div2, d2a, tLt2),
			junctionToTransition(div2, d2b, tGte2),
			linkSeq(tLt2, e5),
			linkSeq(tGte2, e6),
			linkSeq(e5, tBack1),
			linkSeq(e6, tBack0),
			new ConnectionBuilder()
				.id(createRandomId())
				.source("transition", tBack1.id, TRANSITION_HANDLE_SOURCE_SUCCESSOR)
				.target(
					"step-referral-source",
					backTo1Source.id,
					STEP_REFERRAL_SOURCE_HANDLE_TARGET_PREDECESSOR,
				)
				.build(),
			new ConnectionBuilder()
				.id(createRandomId())
				.source("transition", tBack0.id, TRANSITION_HANDLE_SOURCE_SUCCESSOR)
				.target(
					"step-referral-source",
					backTo0Source.id,
					STEP_REFERRAL_SOURCE_HANDLE_TARGET_PREDECESSOR,
				)
				.build(),
			new ConnectionBuilder()
				.id(createRandomId())
				.source(
					"step-referral-target",
					from5Target.id,
					STEP_REFERRAL_TARGET_HANDLE_SOURCE_SUCCESSOR,
				)
				.target("step", e1.id, STEP_HANDLE_TARGET_PREDECESSOR)
				.build(),
			new ConnectionBuilder()
				.id(createRandomId())
				.source(
					"step-referral-target",
					from6Target.id,
					STEP_REFERRAL_TARGET_HANDLE_SOURCE_SUCCESSOR,
				)
				.target("step", e0.id, STEP_HANDLE_TARGET_PREDECESSOR)
				.build(),
			linkAction(e0, aResetT2T3),
			linkAction(e0, aInitC),
			linkAction(e1, aSetT2T3),
			linkAction(e1, aT1),
			linkAction(e11, aP1o11),
			linkAction(e12, aP2o),
			linkAction(e12, aP1i12),
			linkAction(e13, aP2i),
			linkAction(e13, aP1i13),
			linkAction(e21, aP1o21),
			linkAction(e22, aP3o),
			linkAction(e22, aP1i22),
			linkAction(e23, aP3i),
			linkAction(e23, aP1i23),
			linkAction(e4, aP1i4),
			linkAction(e4, aIncC),
		)
		.build();
	project.addProgram(commande);

	return project;
}
