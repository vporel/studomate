import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
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
import { DEFAULT_GRAFCET_FORMAT } from "@/schemas/grafcet/grafcet.schema";
import HmiPage from "@/schemas/hmi/hmi-page.schema";
import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import {
	createArithmeticBlockElement,
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
import Section from "@/schemas/ladder/section.schema";
import Project from "@/schemas/project/project.schema";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import { createRandomId } from "@/ids";

/** Course du foret, du point haut (0) au point bas (100), en pixels d'animation. */
const POSITION_MAX = 100;
/** Avance du foret par cycle automate, dans le modèle de partie opérative. */
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
 * Modèle de partie opérative du poste de perçage, en Ladder — **fourni, à ne pas modifier**.
 * Le simulateur n'a pas de modèle physique : ce programme le remplace en calculant, à chaque
 * cycle, la position du foret d'après les commandes `descendre`/`monter`, puis en déduit les
 * capteurs de fin de course `h` (foret en haut) et `b` (foret en bas), utilisés comme entrées
 * par le GRAFCET de commande.
 */
function buildOperativePartLadder(): Ladder {
	const rail0 = createRailTerminalElement(0);
	const descendreContact = createContactElement("descendre", "NO", 0, 1);
	const canDescend = createCompareBlockElement(0, 3, {
		in1: "position",
		in2: `${POSITION_MAX}`,
		operator: "<",
	});
	const descendStep = createArithmeticBlockElement(0, 5, {
		in1: "position",
		in2: `${PAS}`,
		out: "position",
		operator: "+",
	});

	const rail1 = createRailTerminalElement(1);
	const monterContact = createContactElement("monter", "NO", 1, 1);
	const canRise = createCompareBlockElement(1, 3, {
		in1: "position",
		in2: "0",
		operator: ">",
	});
	const riseStep = createArithmeticBlockElement(1, 5, {
		in1: "position",
		in2: `${PAS}`,
		out: "position",
		operator: "-",
	});

	const rail2 = createRailTerminalElement(2);
	const highSensorCompare = createCompareBlockElement(2, 1, {
		in1: "position",
		in2: "0",
		operator: "<=",
	});
	const highSensorCoil = createCoilElement("h", "normal", 2, 3);

	const rail3 = createRailTerminalElement(3);
	const lowSensorCompare = createCompareBlockElement(3, 1, {
		in1: "position",
		in2: `${POSITION_MAX}`,
		operator: ">=",
	});
	const lowSensorCoil = createCoilElement("b", "normal", 3, 3);

	const rung0 = [rail0, descendreContact, canDescend, descendStep];
	const rung1 = [rail1, monterContact, canRise, riseStep];
	const rung2 = [rail2, highSensorCompare, highSensorCoil];
	const rung3 = [rail3, lowSensorCompare, lowSensorCoil];

	const section = new Section(
		createRandomId(),
		"Modèle de partie opérative",
		"Simule le déplacement du foret et les capteurs de fin de course à la place d'une partie opérative réelle. Ne pas modifier : ce n'est pas le programme de commande à écrire.",
		[...rung0, ...rung1, ...rung2, ...rung3],
		[
			...wireInSeries(rung0),
			...wireInSeries(rung1),
			...wireInSeries(rung2),
			...wireInSeries(rung3),
		],
	);

	return new Ladder(createRandomId(), "Partie opérative", [section]);
}

/** Page HMI commune : bâti, foret animé en hauteur, pièce, bouton départ et voyants. */
function buildDrillingPage(): HmiPage {
	const page = new HmiPage(createRandomId(), "Poste de perçage", true);
	let stack = 0;

	page.addWidget(
		HmiWidget.create(
			"text",
			CX - 140,
			24,
			{ width: 280, height: 28 },
			{
				text: "Poste de perçage",
				style: { fontSize: 16, color: "#333333", align: "center" },
			},
			stack++,
			"Titre",
		),
	);

	// Bâti (colonne verticale)
	page.addWidget(
		HmiWidget.create(
			"rectangle",
			CX + 90,
			90,
			{ width: 40, height: 320 },
			{
				style: {
					fill: "#607d8b",
					stroke: "#455a64",
					strokeWidth: 2,
					borderRadius: 2,
				},
			},
			stack++,
			"Bâti",
		),
	);

	// Table
	page.addWidget(
		HmiWidget.create(
			"rectangle",
			CX - 120,
			380,
			{ width: 260, height: 24 },
			{
				style: {
					fill: "#455a64",
					stroke: "#37474f",
					strokeWidth: 2,
					borderRadius: 2,
				},
			},
			stack++,
			"Table",
		),
	);

	// Pièce à percer
	page.addWidget(
		HmiWidget.create(
			"rectangle",
			CX - 40,
			340,
			{ width: 100, height: 40 },
			{
				style: {
					fill: "#a1887f",
					stroke: "#6d4c41",
					strokeWidth: 2,
					borderRadius: 2,
				},
			},
			stack++,
			"Pièce",
		),
	);

	// Broche + foret, descend avec `position`
	page.addWidget(
		HmiWidget.create(
			"rectangle",
			CX - 15,
			110,
			{ width: 30, height: 120 },
			{
				style: {
					fill: "#eeeeee",
					stroke: "#9e9e9e",
					strokeWidth: 2,
					borderRadius: 2,
				},
				animations: {
					position: { yVariableMnemonic: "position" },
					style: {
						variableMnemonic: "broche",
						rows: [
							{ value: 0, properties: { fill: "#eeeeee", stroke: "#9e9e9e" } },
							{ value: 1, properties: { fill: "#fff59d", stroke: "#f9a825" } },
						],
					},
				},
			},
			stack++,
			"Broche",
		),
	);

	// Bouton départ cycle
	page.addWidget(
		HmiWidget.create(
			"push-button",
			140,
			120,
			{ width: 200, height: 44 },
			{ variableMnemonic: "dcy", label: "Départ cycle" },
			stack++,
			"BP départ",
		),
	);

	// Voyants
	const voyants: Array<{ mnemonic: string; label: string }> = [
		{ mnemonic: "descendre", label: "Descente" },
		{ mnemonic: "monter", label: "Montée" },
		{ mnemonic: "broche", label: "Broche" },
		{ mnemonic: "h", label: "Foret en haut" },
		{ mnemonic: "b", label: "Foret en bas" },
	];
	voyants.forEach(({ mnemonic, label }, i) => {
		page.addWidget(
			HmiWidget.create(
				"indicator",
				160,
				200 + i * 64,
				{ width: 36, height: 36 },
				{ variableMnemonic: mnemonic, label },
				stack++,
				`Voyant ${mnemonic}`,
			),
		);
	});

	return page;
}

/**
 * Crée un projet "Poste de perçage" pré-configuré :
 * — 1 entrée booléenne `dcy` + 3 sorties (`descendre`, `monter`, `broche`)
 * — les capteurs `h`/`b` et la position `position` en mémoire, calculés par le modèle de partie
 *   opérative (Ladder « Partie opérative », fourni et référencé par le Main)
 * — 1 page HMI (bâti, foret animé, bouton, voyants)
 * — pas de GRAFCET de commande : c'est ce que l'étudiant écrit
 */
export function createDrillingProject(): Project {
	const project = new Project(createRandomId(), "Poste de perçage", "");

	project.variables.push(
		VariableBuilder.buildLogicInput(createRandomId(), "dcy"),
		VariableBuilder.buildLogicOutput(createRandomId(), "descendre"),
		VariableBuilder.buildLogicOutput(createRandomId(), "monter"),
		VariableBuilder.buildLogicOutput(createRandomId(), "broche"),
		VariableBuilder.buildMemoryBool(createRandomId(), "h"),
		VariableBuilder.buildMemoryBool(createRandomId(), "b"),
		VariableBuilder.buildMemoryInt(createRandomId(), "position"),
	);

	const operativePart = buildOperativePartLadder();
	project.addProgram(operativePart);
	const [mainSection] = project.main.sections;
	project.main.addElements(mainSection.id, [
		createUserProgramBlockElement(operativePart.id, 0, 0),
	]);

	const page = buildDrillingPage();
	project.hmiPages[page.id] = page;

	return project;
}

/**
 * Version complète et simulable du poste de perçage.
 *
 * GRAFCET "Commande" :
 *   E0 (initial) ─[dcy]→ E1 (descendre) ─[b]→ E2 (broche, 2 s) ─[t2/X2/2s]→ E3 (monter) ─[h]→ E0
 *
 * Les capteurs `h`/`b` proviennent du modèle de partie opérative (Ladder), pas d'entrées
 * physiques : la simulation tourne donc sans intervention après appui sur « Départ cycle ».
 */
export function createDrillingSolution(): Project {
	const project = createDrillingProject();
	project.name = "Poste de perçage — solution";

	const X = 200;
	const e0 = new StepBuilder()
		.id(createRandomId())
		.number(0)
		.initial()
		.position(X, 40)
		.build();
	const t0 = new TransitionBuilder()
		.id(createRandomId())
		.expression("dcy")
		.position(X, 90)
		.build();
	const e1 = new StepBuilder()
		.id(createRandomId())
		.number(1)
		.position(X, 140)
		.build();
	const t1 = new TransitionBuilder()
		.id(createRandomId())
		.expression("b")
		.position(X, 190)
		.build();
	const e2 = new StepBuilder()
		.id(createRandomId())
		.number(2)
		.position(X, 240)
		.build();
	const t2 = new TransitionBuilder()
		.id(createRandomId())
		.expression("t2/X2/2s")
		.position(X, 290)
		.build();
	const e3 = new StepBuilder()
		.id(createRandomId())
		.number(3)
		.position(X, 340)
		.build();
	const t3 = new TransitionBuilder()
		.id(createRandomId())
		.expression("h")
		.position(X, 390)
		.build();

	const aDescendre = new ActionBuilder()
		.id(createRandomId())
		.expression("descendre")
		.type(ActionType.BOOLEAN_VARIABLE)
		.executionMode(ActionExecutionMode.CONTINUOUS)
		.position(X + 80, 140)
		.build();
	const aBroche = new ActionBuilder()
		.id(createRandomId())
		.expression("broche")
		.type(ActionType.BOOLEAN_VARIABLE)
		.executionMode(ActionExecutionMode.CONTINUOUS)
		.position(X + 80, 240)
		.build();
	const aMonter = new ActionBuilder()
		.id(createRandomId())
		.expression("monter")
		.type(ActionType.BOOLEAN_VARIABLE)
		.executionMode(ActionExecutionMode.CONTINUOUS)
		.position(X + 80, 340)
		.build();

	const linkSeq = (
		src:
			ReturnType<StepBuilder["build"]> | ReturnType<TransitionBuilder["build"]>,
		tgt:
			ReturnType<StepBuilder["build"]> | ReturnType<TransitionBuilder["build"]>,
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

	const commande = new GrafcetBuilder()
		.id(createRandomId())
		.name("Commande")
		.format(DEFAULT_GRAFCET_FORMAT)
		.addSteps(e0, e1, e2, e3)
		.addTransitions(t0, t1, t2, t3)
		.addActions(aDescendre, aBroche, aMonter)
		.addConnections(
			linkSeq(e0, t0),
			linkSeq(t0, e1),
			linkSeq(e1, t1),
			linkSeq(t1, e2),
			linkSeq(e2, t2),
			linkSeq(t2, e3),
			linkSeq(e3, t3),
			linkSeq(t3, e0),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				e1,
				STEP_HANDLE_SOURCE_ACTION,
				aDescendre,
				ACTION_HANDLE_TARGET_STEP,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				e2,
				STEP_HANDLE_SOURCE_ACTION,
				aBroche,
				ACTION_HANDLE_TARGET_STEP,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				e3,
				STEP_HANDLE_SOURCE_ACTION,
				aMonter,
				ACTION_HANDLE_TARGET_STEP,
			),
		)
		.build();
	project.addProgram(commande);

	return project;
}
