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
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import { DEFAULT_GRAFCET_FORMAT } from "@/schemas/grafcet/grafcet.schema";
import { JUNCTION_HANDLE_PIVOT } from "@/schemas/grafcet/junction.schema";
import {
	STEP_HANDLE_SOURCE_ACTION,
	STEP_HANDLE_SOURCE_SUCCESSOR,
	STEP_HANDLE_TARGET_PREDECESSOR,
} from "@/schemas/grafcet/step.schema";
import {
	TRANSITION_HANDLE_SOURCE_SUCCESSOR,
	TRANSITION_HANDLE_TARGET_PREDECESSOR,
} from "@/schemas/grafcet/transition.schema";
import HmiPage from "@/schemas/hmi/hmi-page.schema";
import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import {
	createArithmeticBlockElement,
	createAssignBlockElement,
	createCompareBlockElement,
	createUserProgramBlockElement,
} from "@/schemas/ladder/block.schema";
import Connection from "@/schemas/ladder/connection.schema";
import {
	createCoilElement,
	createContactElement,
	createRailTerminalElement,
	LadderElement,
} from "@/schemas/ladder/element.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Project from "@/schemas/project/project.schema";
import Section from "@/schemas/ladder/section.schema";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";

/** Hauteur de gaine, du RDC (0) au 2ᵉ étage (200), en pixels d'animation. */
const POSITION_MAX = 200;
/** Position d'animation de chaque palier. */
const ETAGE_POSITION = [0, 100, POSITION_MAX];
/** Course de la porte, de fermée (0) à ouverte (100). */
const PORTE_MAX = 100;
/** Avance de la cabine et de la porte par cycle automate. */
const PAS = 2;

const CX = 500;

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

/**
 * Modèle de partie opérative de l'ascenseur, en Ladder — **fourni, à ne pas modifier**.
 * Le simulateur n'a pas de modèle physique : ce programme le remplace en calculant, à chaque
 * cycle, la position de la cabine d'après les commandes `monter`/`descendre` et l'avancement de
 * la porte d'après `porte`. Il en déduit les capteurs d'étage `etage_0/1/2`, la fin de course
 * `porte_ouverte`, la position d'animation `cabine_y` et le numéro d'étage `etage_courant`
 * affiché — ce dernier calculé à partir des seuls capteurs d'étage, comme sur un pupitre réel.
 */
function buildOperativePartLadder(): Ladder {
	const rungs: LadderElement[][] = [];

	// Déplacement de la cabine
	rungs.push([
		createRailTerminalElement(0),
		createContactElement("monter", "NO", 0, 1),
		createCompareBlockElement(0, 3, {
			in1: "position",
			in2: `${POSITION_MAX}`,
			operator: "<",
		}),
		createArithmeticBlockElement(0, 5, {
			in1: "position",
			in2: `${PAS}`,
			out: "position",
			operator: "+",
		}),
	]);
	rungs.push([
		createRailTerminalElement(1),
		createContactElement("descendre", "NO", 1, 1),
		createCompareBlockElement(1, 3, {
			in1: "position",
			in2: "0",
			operator: ">",
		}),
		createArithmeticBlockElement(1, 5, {
			in1: "position",
			in2: `${PAS}`,
			out: "position",
			operator: "-",
		}),
	]);

	// Avancement de la porte (ouverture ≈ 2 s, fermeture ≈ 2 s)
	rungs.push([
		createRailTerminalElement(2),
		createContactElement("porte", "NO", 2, 1),
		createCompareBlockElement(2, 3, {
			in1: "porte_pos",
			in2: `${PORTE_MAX}`,
			operator: "<",
		}),
		createArithmeticBlockElement(2, 5, {
			in1: "porte_pos",
			in2: `${PAS}`,
			out: "porte_pos",
			operator: "+",
		}),
	]);
	rungs.push([
		createRailTerminalElement(3),
		createContactElement("porte", "NF", 3, 1),
		createCompareBlockElement(3, 3, {
			in1: "porte_pos",
			in2: "0",
			operator: ">",
		}),
		createArithmeticBlockElement(3, 5, {
			in1: "porte_pos",
			in2: `${PAS}`,
			out: "porte_pos",
			operator: "-",
		}),
	]);

	// Position d'animation : la cabine monte quand `position` augmente
	rungs.push([
		createRailTerminalElement(4),
		createArithmeticBlockElement(4, 1, {
			in1: `${POSITION_MAX}`,
			in2: "position",
			out: "cabine_y",
			operator: "-",
		}),
	]);

	// Capteurs de présence à chaque étage
	rungs.push([
		createRailTerminalElement(5),
		createCompareBlockElement(5, 1, {
			in1: "position",
			in2: `${ETAGE_POSITION[0] + 1}`,
			operator: "<=",
		}),
		createCoilElement("etage_0", "normal", 5, 3),
	]);
	rungs.push([
		createRailTerminalElement(6),
		createCompareBlockElement(6, 1, {
			in1: "position",
			in2: `${ETAGE_POSITION[1] - 1}`,
			operator: ">=",
		}),
		createCompareBlockElement(6, 3, {
			in1: "position",
			in2: `${ETAGE_POSITION[1] + 1}`,
			operator: "<=",
		}),
		createCoilElement("etage_1", "normal", 6, 5),
	]);
	rungs.push([
		createRailTerminalElement(7),
		createCompareBlockElement(7, 1, {
			in1: "position",
			in2: `${ETAGE_POSITION[2] - 1}`,
			operator: ">=",
		}),
		createCoilElement("etage_2", "normal", 7, 3),
	]);

	// Fin de course porte ouverte
	rungs.push([
		createRailTerminalElement(8),
		createCompareBlockElement(8, 1, {
			in1: "porte_pos",
			in2: `${PORTE_MAX}`,
			operator: ">=",
		}),
		createCoilElement("porte_ouverte", "normal", 8, 3),
	]);

	// Numéro d'étage affiché, déduit des capteurs de présence
	ETAGE_POSITION.forEach((_, etage) => {
		const row = 9 + etage;
		rungs.push([
			createRailTerminalElement(row),
			createContactElement(`etage_${etage}`, "NO", row, 1),
			createAssignBlockElement(row, 3, {
				out: "etage_courant",
				in: `${etage}`,
			}),
		]);
	});

	const section = new Section(
		createRandomId(),
		"Modèle de partie opérative",
		"Simule le déplacement de la cabine, la porte et les capteurs d'étage à la place d'une partie opérative réelle. Ne pas modifier : ce n'est pas le programme de commande à écrire.",
		rungs.flat(),
		rungs.flatMap(wireInSeries),
	);

	return new Ladder(createRandomId(), "Partie opérative", [section]);
}

/** Page HMI commune : gaine, cabine et porte animées, boutons palier et cabine, voyants. */
function buildElevatorPage(): HmiPage {
	const page = new HmiPage(createRandomId(), "Ascenseur", true);
	let stack = 0;

	const addWidget = (
		type: Parameters<typeof HmiWidget.create>[0],
		x: number,
		y: number,
		size: { width: number; height: number },
		data: Parameters<typeof HmiWidget.create>[4],
		name: string,
	) => page.addWidget(HmiWidget.create(type, x, y, size, data, stack++, name));

	addWidget(
		"text",
		CX - 140,
		20,
		{ width: 280, height: 28 },
		{
			text: "Ascenseur 3 niveaux",
			style: { fontSize: 16, color: "#333333", align: "center" },
		},
		"Titre",
	);

	// Gaine
	addWidget(
		"rectangle",
		CX - 80,
		60,
		{ width: 160, height: 330 },
		{
			style: {
				fill: "#eceff1",
				stroke: "#90a4ae",
				strokeWidth: 2,
				borderRadius: 2,
			},
		},
		"Gaine",
	);

	// Repères de niveau (le RDC est en bas, le 2ᵉ en haut)
	ETAGE_POSITION.forEach((posEtage, etage) => {
		const y = 70 + (POSITION_MAX - posEtage);
		addWidget(
			"text",
			CX - 78,
			y,
			{ width: 60, height: 20 },
			{
				text: etage === 0 ? "RDC" : `${etage}`,
				style: { fontSize: 12, color: "#607d8b", align: "left" },
			},
			`Repère ${etage}`,
		);
	});

	// Cabine, animée en hauteur sur `cabine_y`
	addWidget(
		"rectangle",
		CX - 55,
		80,
		{ width: 90, height: 90 },
		{
			style: {
				fill: "#b0bec5",
				stroke: "#546e7a",
				strokeWidth: 2,
				borderRadius: 2,
			},
			animations: { position: { yVariable: "cabine_y" } },
		},
		"Cabine",
	);

	// Porte : bande fine à droite de la cabine, suit la cabine ; verte ouverte, rouge fermée
	addWidget(
		"rectangle",
		CX + 35,
		80,
		{ width: 14, height: 90 },
		{
			style: {
				fill: "#c62828",
				stroke: "#7f1d1d",
				strokeWidth: 1,
				borderRadius: 1,
			},
			animations: {
				position: { yVariable: "cabine_y" },
				style: {
					variable: "porte_ouverte",
					rows: [
						{ value: 0, properties: { fill: "#c62828", stroke: "#7f1d1d" } },
						{ value: 1, properties: { fill: "#2e7d32", stroke: "#1b5e20" } },
					],
				},
			},
		},
		"Porte",
	);

	// Boutons d'appel palier, alignés sur les niveaux
	ETAGE_POSITION.forEach((posEtage, etage) => {
		const y = 70 + (POSITION_MAX - posEtage);
		addWidget(
			"push-button",
			120,
			y - 8,
			{ width: 180, height: 40 },
			{
				variable: `appel_${etage}`,
				label: etage === 0 ? "Appel RDC" : `Appel étage ${etage}`,
			},
			`Appel palier ${etage}`,
		);
	});

	// Pupitre de cabine
	const colX = 640;
	addWidget(
		"text",
		colX,
		60,
		{ width: 200, height: 22 },
		{
			text: "Pupitre cabine",
			style: { fontSize: 13, color: "#333333", align: "left" },
		},
		"Titre pupitre",
	);
	[2, 1, 0].forEach((etage, i) => {
		addWidget(
			"push-button",
			colX,
			90 + i * 52,
			{ width: 200, height: 40 },
			{
				variable: `cabine_${etage}`,
				label: etage === 0 ? "RDC" : `Étage ${etage}`,
			},
			`Bouton cabine ${etage}`,
		);
	});

	// Voyants
	const voyants: Array<{ mnemonic: string; label: string }> = [
		{ mnemonic: "monter", label: "Montée" },
		{ mnemonic: "descendre", label: "Descente" },
		{ mnemonic: "porte_ouverte", label: "Porte ouverte" },
	];
	voyants.forEach(({ mnemonic, label }, i) => {
		addWidget(
			"indicator",
			colX,
			270 + i * 56,
			{ width: 36, height: 36 },
			{ variable: mnemonic, label },
			`Voyant ${mnemonic}`,
		);
	});

	// Afficheur d'étage
	addWidget(
		"numeric-display",
		colX,
		450,
		{ width: 200, height: 44 },
		{ variable: "etage_courant", label: "Étage", decimalPlaces: 0 },
		"Afficheur étage",
	);

	return page;
}

/**
 * Crée un projet "Ascenseur" pré-configuré :
 * — 6 entrées booléennes : `appel_0/1/2` (paliers), `cabine_0/1/2` (pupitre)
 * — 3 sorties : `monter`, `descendre`, `porte`
 * — les capteurs et grandeurs internes en mémoire (`position`, `porte_pos`, `cabine_y`,
 *   `etage_0/1/2`, `porte_ouverte`, `etage_courant`), calculés par le modèle de partie
 *   opérative (Ladder « Partie opérative », fourni et référencé par le Main)
 * — 1 page HMI (gaine, cabine et porte animées, boutons, voyants, afficheur)
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
		VariableBuilder.buildMemoryInt(createRandomId(), "position"),
		VariableBuilder.buildMemoryInt(createRandomId(), "porte_pos"),
		VariableBuilder.buildMemoryInt(createRandomId(), "cabine_y"),
		VariableBuilder.buildMemoryBool(createRandomId(), "etage_0"),
		VariableBuilder.buildMemoryBool(createRandomId(), "etage_1"),
		VariableBuilder.buildMemoryBool(createRandomId(), "etage_2"),
		VariableBuilder.buildMemoryBool(createRandomId(), "porte_ouverte"),
		VariableBuilder.buildMemoryInt(createRandomId(), "etage_courant"),
	);

	const operativePart = buildOperativePartLadder();
	project.addProgram(operativePart);
	const [mainSection] = project.main.sections;
	const mainRail = createRailTerminalElement(0);
	const mainBlock = createUserProgramBlockElement(operativePart.id, 0, 0);
	project.main.addElements(mainSection.id, [mainRail, mainBlock]);
	project.main.addConnections(mainSection.id, wireInSeries([mainRail, mainBlock]));

	const page = buildElevatorPage();
	project.hmiPages[page.id] = page;

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
 *      convergence → E7 (porte) ─[porte_ouverte ET t7/X7/2s]→ E8 ─[NON porte_ouverte]→ E0
 *
 * Les capteurs et l'afficheur proviennent du modèle de partie opérative : après un appel, la
 * simulation se déroule sans intervention.
 */
export function createElevatorSolution(): Project {
	const project = createElevatorProject();
	project.name = "Ascenseur — solution";

	project.variables.push(
		VariableBuilder.buildMemoryInt(createRandomId(), "cible"),
	);

	const XL = 180;
	const XM = 400;
	const XR = 620;
	const juWidth = XR - XL + 40;
	const juBranches: [number, number, number] = [20, XM - XL + 20, XR - XL + 20];
	const juPivot = CX - 20 - XL;

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

	const e0 = step(0, CX - 20, 40, true);
	const div1 = orStart(95);
	const t0a = trans("appel_0 OU cabine_0", XL, 150);
	const t0b = trans("appel_1 OU cabine_1", XM, 150);
	const t0c = trans("appel_2 OU cabine_2", XR, 150);
	const e1a = step(1, XL, 210);
	const e1b = step(2, XM, 210);
	const e1c = step(3, XR, 210);
	const aCible0 = memoAction("cible := 0", XL + 60, 210);
	const aCible1 = memoAction("cible := 1", XM + 60, 210);
	const aCible2 = memoAction("cible := 2", XR + 60, 210);
	const tA = trans("cible >= 0", XL, 285);
	const tB = trans("cible >= 0", XM, 285);
	const tC = trans("cible >= 0", XR, 285);
	const conv1 = orEnd(335);
	const e2 = step(4, CX - 20, 385);
	const div2 = orStart(440);
	const tUp = trans("cible > etage_courant", XL, 495);
	const tDown = trans("cible < etage_courant", XM, 495);
	const tSame = trans("cible = etage_courant", XR, 495);
	const e5 = step(5, XL, 555);
	const e6 = step(6, XM, 555);
	const aMonter = boolAction("monter", XL + 60, 555);
	const aDescendre = boolAction("descendre", XM + 60, 555);
	const tUpDone = trans("cible = etage_courant", XL, 630);
	const tDownDone = trans("cible = etage_courant", XM, 630);
	const conv2 = orEnd(685);
	const e7 = step(7, CX - 20, 735);
	const aPorte = boolAction("porte", CX + 60, 735);
	const tPorte = trans("porte_ouverte ET t7/X7/2s", CX, 805);
	const e8 = step(8, CX - 20, 865);
	const tFerme = trans("NON porte_ouverte", CX, 930);

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
		.format(DEFAULT_GRAFCET_FORMAT)
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
		.addActions(
			aCible0,
			aCible1,
			aCible2,
			aMonter,
			aDescendre,
			aPorte,
		)
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
			new ConnectionBuilder()
				.id(createRandomId())
				.source("transition", tFerme.id, TRANSITION_HANDLE_SOURCE_SUCCESSOR)
				.target("step", e0.id, STEP_HANDLE_TARGET_PREDECESSOR)
				.data([
					[XL - 90, 950],
					[XL - 90, 15],
					[CX - 15, 15],
				])
				.build(),
			linkSeq(e8, tFerme),
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
