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
import ElevatorDescriptor from "@/3d-scenes/elevator/v1/elevator.descriptor";
import { FLOOR_POSITIONS } from "@/3d-scenes/elevator/v1/elevator.model";
import {
	createAssignBlockElement,
	createUserProgramBlockElement,
} from "@/schemas/ladder/block.schema";
import Connection from "@/schemas/ladder/connection.schema";
import {
	createContactElement,
	createRailTerminalElement,
	getElementHeight,
	LadderElement,
} from "@/schemas/ladder/element.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Project from "@/schemas/project/project.schema";
import Section from "@/schemas/ladder/section.schema";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";

/** Chaîne chaque élément au suivant sur une ligne (ET implicite : rail → … → dernier). */
function wireInSeries(elements: LadderElement[]): Connection[] {
	const connections: Connection[] = [];
	for (let i = 0; i < elements.length - 1; i++) {
		connections.push(
			new Connection(
				createRandomId(),
				{ id: elements[i].id, type: elements[i].type, handle: "source" },
				{
					id: elements[i + 1].id,
					type: elements[i + 1].type,
					handle: "target",
				},
			),
		);
	}
	return connections;
}

type RungBuilder = (build: (row: number) => LadderElement[]) => void;

/**
 * Construit une section : chaque `rung()` pose une ligne à la rangée courante puis avance du
 * nombre de cellules occupées par son élément le plus haut (un bloc Calc ou Assign en occupe
 * deux) — sans quoi la ligne suivante le chevaucherait.
 */
function buildLadderSection(
	name: string,
	description: string,
	fill: (rung: RungBuilder) => void,
): Section {
	const rungs: LadderElement[][] = [];
	let row = 0;
	const rung: RungBuilder = (build) => {
		const elements = build(row);
		rungs.push(elements);
		row += Math.max(...elements.map(getElementHeight));
	};
	fill(rung);
	return new Section(
		createRandomId(),
		name,
		description,
		rungs.flat(),
		rungs.flatMap(wireInSeries),
	);
}

/**
 * Programme d'affichage de l'ascenseur, en Ladder, **fourni, à ne pas modifier**. La partie
 * opérative (cabine, porte, capteurs) est simulée par la scène 3D : ce programme en déduit les
 * numéro d'étage courant affiché sur le pupitre de la scène.
 */
function buildDisplayLadder(): Ladder {
	const affichage = buildLadderSection(
		"Affichage",
		"Sortie destinée au pupitre : numéro d'étage courant.",
		(rung) => {
			// Numéro d'étage affiché, déduit des capteurs de présence
			FLOOR_POSITIONS.forEach((_, etage) => {
				rung((r) => [
					createRailTerminalElement(r),
					createContactElement(`etage_${etage}`, "NO", r, 1),
					createAssignBlockElement(r, 3, {
						out: "etage_courant",
						in: `${etage}`,
					}),
				]);
			});
		},
	);

	return new Ladder(createRandomId(), "Affichage", [affichage]);
}

/**
 * Crée un projet "Ascenseur" pré-configuré :
 * — 3 sorties : `monter`, `descendre`, `porte`
 * — 10 capteurs booléens fournis par la scène 3D : `etage_0/1/2` (cabine au palier),
 *   `porte_ouverte`, `appel_0/1/2` (boutons palier) et `cabine_0/1/2` (boutons de la cabine), plus l'entrée analogique `position` (hauteur de la cabine)
 * — en mémoire, `etage_courant`, calculé par le Ladder « Affichage » (affiché sur le pupitre 3D)
 *   (fourni et référencé par le Main)
 * — scène 3D « Ascenseur » câblée sur les sorties et les capteurs
 * — pas de GRAFCET de commande : c'est ce que l'étudiant écrit
 */
export function createElevatorProject(): Project {
	const project = new Project(createRandomId(), "Ascenseur", "");

	project.variables.push(
		VariableBuilder.buildLogicInput(createRandomId(), "appel_0"),
		VariableBuilder.buildLogicInput(createRandomId(), "appel_1"),
		VariableBuilder.buildLogicInput(createRandomId(), "appel_2"),
		VariableBuilder.buildLogicInput(createRandomId(), "cabine_0"),
		VariableBuilder.buildLogicInput(createRandomId(), "cabine_1"),
		VariableBuilder.buildLogicInput(createRandomId(), "cabine_2"),
		VariableBuilder.buildLogicOutput(createRandomId(), "monter"),
		VariableBuilder.buildLogicOutput(createRandomId(), "descendre"),
		VariableBuilder.buildLogicOutput(createRandomId(), "porte"),
		VariableBuilder.buildLogicInput(createRandomId(), "etage_0"),
		VariableBuilder.buildLogicInput(createRandomId(), "etage_1"),
		VariableBuilder.buildLogicInput(createRandomId(), "etage_2"),
		VariableBuilder.buildLogicInput(createRandomId(), "porte_ouverte"),
		VariableBuilder.buildAnalogInput(createRandomId(), "position"),
		VariableBuilder.buildMemoryInt(createRandomId(), "etage_courant"),
	);

	const variableIdByMnemonic = new Map(
		project.variables.map((variable) => [variable.mnemonic, variable.id]),
	);
	project.scene3d = {
		sceneId: ElevatorDescriptor.id,
		sceneVersion: ElevatorDescriptor.version,
		bindings: Object.fromEntries(
			ElevatorDescriptor.points.map((point) => [
				point.id,
				variableIdByMnemonic.get(point.suggestedMnemonic)!,
			]),
		),
	};

	const displayLadder = buildDisplayLadder();
	project.addProgram(displayLadder);
	const [mainSection] = project.main.sections;
	const mainRail = createRailTerminalElement(0);
	const mainBlock = createUserProgramBlockElement(displayLadder.id, 0, 0);
	project.main.addElements(mainSection.id, [mainRail, mainBlock]);
	project.main.addConnections(
		mainSection.id,
		wireInSeries([mainRail, mainBlock]),
	);

	return project;
}

/**
 * Version complète et simulable de l'ascenseur.
 *
 * GRAFCET "Commande" :
 *   E0 (initial) ─OU─ [appel_k OU cabine_k] → E1a/E1b/E1c : mémorisent `cible := k`
 *      convergence → E2 (aiguillage)
 *   E2 ─OU─ [cible > etage_courant] → E5 (monter) ─[cible = etage_courant]→ ┐
 *          [cible < etage_courant] → E6 (descendre) ─[cible = etage_courant]→ ┤
 *          [cible = etage_courant] ─────────────────────────────────────────→ ┘
 *      convergence → E7 (porte) ─[porte_ouverte ET t7/X7/4s]→ E8 ─[NON porte_ouverte]→ E0
 *
 * Les capteurs proviennent de la scène 3D et l'afficheur du Ladder « Affichage » : après un appel, la
 * simulation se déroule sans intervention.
 */
export function createElevatorSolution(): Project {
	const project = createElevatorProject();
	project.name = "Ascenseur — solution";

	project.variables.push(
		VariableBuilder.buildMemoryInt(createRandomId(), "cible"),
	);

	// Colonne centrale du grafcet (étapes 0, 4, 7, 8 et transitions de la séquence porte).
	const GX = 360;
	const XL = 120;
	const XM = 340;
	const XR = 560;
	const juWidth = XR - XL + 40;
	const juBranches: [number, number, number] = [20, XM - XL + 20, XR - XL + 20];
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
			.nBranches(3)
			.dimensions(juWidth, 30)
			.branchesPositions(...juBranches)
			.pivotPosition(juPivot)
			.position(XL, y)
			.build();
	const orEnd = (y: number) =>
		new JunctionOrEndBuilder()
			.id(createRandomId())
			.dimensions(juWidth, 30)
			.nBranches(3)
			.branchesPositions(...juBranches)
			.pivotPosition(juPivot)
			.position(XL, y)
			.build();
	const boolAction = (expression: string, x: number, y: number) =>
		new ActionBuilder()
			.id(createRandomId())
			.expression(expression)
			.type(ActionType.BOOLEAN_VARIABLE)
			.executionMode(ActionExecutionMode.CONTINUOUS)
			.position(x, y)
			.build();
	const memoAction = (expression: string, x: number, y: number) =>
		new ActionBuilder()
			.id(createRandomId())
			.expression(expression)
			.type(ActionType.NUMERIC_VARIABLE)
			.executionMode(ActionExecutionMode.RISING_EDGE)
			.width(140)
			.position(x, y)
			.build();

	// Marge haute : l'aboutissant du renvoi d'étape (provenance E8) se loge au-dessus de l'étape 0.
	const e0 = step(0, GX - 20, 95, true);
	const div1 = orStart(150);
	const t0a = trans("appel_0 OU cabine_0", XL, 205);
	const t0b = trans("appel_1 OU cabine_1", XM, 205);
	const t0c = trans("appel_2 OU cabine_2", XR, 205);
	const e1a = step(1, XL, 265);
	const e1b = step(2, XM, 265);
	const e1c = step(3, XR, 265);
	const aCible0 = memoAction("cible := 0", XL + 60, 265);
	const aCible1 = memoAction("cible := 1", XM + 60, 265);
	const aCible2 = memoAction("cible := 2", XR + 60, 265);
	const tA = trans("cible >= 0", XL, 340);
	const tB = trans("cible >= 0", XM, 340);
	const tC = trans("cible >= 0", XR, 340);
	const conv1 = orEnd(390);
	const e2 = step(4, GX - 20, 440);
	const div2 = orStart(495);
	const tUp = trans("cible > etage_courant", XL, 550);
	const tDown = trans("cible < etage_courant", XM, 550);
	const tSame = trans("cible = etage_courant", XR, 550);
	const e5 = step(5, XL, 610);
	const e6 = step(6, XM, 610);
	const aMonter = boolAction("monter", XL + 60, 610);
	const aDescendre = boolAction("descendre", XM + 60, 610);
	const tUpDone = trans("cible = etage_courant", XL, 685);
	const tDownDone = trans("cible = etage_courant", XM, 685);
	const conv2 = orEnd(740);
	const e7 = step(7, GX - 20, 790);
	const aPorte = boolAction("porte", GX + 60, 790);
	const tPorte = trans("porte_ouverte ET t7/X7/4s", GX - 20, 860);
	const e8 = step(8, GX - 20, 920);
	const tFerme = trans("NON porte_ouverte", GX - 20, 985);
	const renvoiVersE0 = new StepReferralSourceBuilder()
		.id(createRandomId())
		.targetStepNumber(0)
		.position(GX - 20, 1035)
		.build();
	const provenanceE8 = new StepReferralTargetBuilder()
		.id(createRandomId())
		.sourceStepNumber(8)
		.position(GX - 20, 20)
		.build();

	const [d1a, d1b, d1c] = div1.data.branchesOrder;
	const [c1a, c1b, c1c] = conv1.data.branchesOrder;
	const [d2a, d2b, d2c] = div2.data.branchesOrder;
	const [c2a, c2b, c2c] = conv2.data.branchesOrder;

	const linkSeq = (
		src: ReturnType<typeof step> | ReturnType<typeof trans>,
		tgt: ReturnType<typeof step> | ReturnType<typeof trans>,
	) =>
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
		.addSteps(e0, e1a, e1b, e1c, e2, e5, e6, e7, e8)
		.addTransitions(
			t0a,
			t0b,
			t0c,
			tA,
			tB,
			tC,
			tUp,
			tDown,
			tSame,
			tUpDone,
			tDownDone,
			tPorte,
			tFerme,
		)
		.addJunctionsOrStarts(div1, div2)
		.addJunctionsOrEnds(conv1, conv2)
		.addStepReferralsSources(renvoiVersE0)
		.addStepReferralsTargets(provenanceE8)
		.addActions(aCible0, aCible1, aCible2, aMonter, aDescendre, aPorte)
		.addConnections(
			stepToJunction(e0, div1),
			junctionToTransition(div1, d1a, t0a),
			junctionToTransition(div1, d1b, t0b),
			junctionToTransition(div1, d1c, t0c),
			linkSeq(t0a, e1a),
			linkSeq(t0b, e1b),
			linkSeq(t0c, e1c),
			linkSeq(e1a, tA),
			linkSeq(e1b, tB),
			linkSeq(e1c, tC),
			transitionToJunction(tA, conv1, c1a),
			transitionToJunction(tB, conv1, c1b),
			transitionToJunction(tC, conv1, c1c),
			junctionToStep(conv1, e2),
			stepToJunction(e2, div2),
			junctionToTransition(div2, d2a, tUp),
			junctionToTransition(div2, d2b, tDown),
			junctionToTransition(div2, d2c, tSame),
			linkSeq(tUp, e5),
			linkSeq(tDown, e6),
			linkSeq(e5, tUpDone),
			linkSeq(e6, tDownDone),
			transitionToJunction(tUpDone, conv2, c2a),
			transitionToJunction(tDownDone, conv2, c2b),
			transitionToJunction(tSame, conv2, c2c),
			junctionToStep(conv2, e7),
			linkSeq(e7, tPorte),
			linkSeq(tPorte, e8),
			linkSeq(e8, tFerme),
			new ConnectionBuilder()
				.id(createRandomId())
				.source("transition", tFerme.id, TRANSITION_HANDLE_SOURCE_SUCCESSOR)
				.target(
					"step-referral-source",
					renvoiVersE0.id,
					STEP_REFERRAL_SOURCE_HANDLE_TARGET_PREDECESSOR,
				)
				.build(),
			new ConnectionBuilder()
				.id(createRandomId())
				.source(
					"step-referral-target",
					provenanceE8.id,
					STEP_REFERRAL_TARGET_HANDLE_SOURCE_SUCCESSOR,
				)
				.target("step", e0.id, STEP_HANDLE_TARGET_PREDECESSOR)
				.build(),
			linkAction(e1a, aCible0),
			linkAction(e1b, aCible1),
			linkAction(e1c, aCible2),
			linkAction(e5, aMonter),
			linkAction(e6, aDescendre),
			linkAction(e7, aPorte),
		)
		.build();
	project.addProgram(commande);

	return project;
}
