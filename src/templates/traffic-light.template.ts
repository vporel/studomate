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
import Project from "@/schemas/project/project.schema";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import { createRandomId } from "@/ids";

/** Centre horizontal du canvas HMI (1000 px) */
const CX = 500;
/** Centre vertical du canvas HMI (640 px) */
const CY = 320;

/** Taille des voyants */
const VOYANT_SIZE = { width: 60, height: 60 };

/** Espacement vertical entre les voyants */
const VOYANT_GAP = 20;

/** Hauteur totale de la colonne de voyants (3 voyants + 2 espaces) */
const COLUMN_HEIGHT = 3 * VOYANT_SIZE.height + 2 * VOYANT_GAP;

/** Y du premier voyant (rouge), centré verticalement avec un décalage pour laisser de la place au titre */
const Y_START = CY - COLUMN_HEIGHT / 2 + 30;

/**
 * Crée un projet "Feu tricolore" pré-configuré :
 * — 3 variables de sortie booléennes (rouge, orange, vert)
 * — 1 page HMI avec 3 voyants animés par style + un titre
 * — aucun programme (l'étudiant l'écrit)
 *
 * Appelée par `_newProject` quand l'utilisateur choisit ce template.
 */
export function createTrafficLightProject(): Project {
	const project = new Project(createRandomId(), "Feu tricolore", "");

	// — Variables de sortie ———————————————————————————————————————————————
	const varRouge = VariableBuilder.buildLogicOutput(createRandomId(), "rouge");
	const varOrange = VariableBuilder.buildLogicOutput(
		createRandomId(),
		"orange",
	);
	const varVert = VariableBuilder.buildLogicOutput(createRandomId(), "vert");
	project.variables.push(varRouge, varOrange, varVert);

	// — Page HMI ——————————————————————————————————————————————————————————
	const page = new HmiPage(createRandomId(), "Feu tricolore", true);

	// Titre
	const titre = HmiWidget.create(
		"text",
		CX - 80,
		40,
		{ width: 160, height: 30 },
		{
			text: "Feu tricolore",
			style: { fontSize: 16, color: "#333333", align: "center" },
		},
		0,
		"Titre",
	);
	page.addWidget(titre);

	// Fond du feu (rectangle noir arrondi)
	const fond = HmiWidget.create(
		"rectangle",
		CX - 50,
		Y_START - 20,
		{ width: 100, height: COLUMN_HEIGHT + 40 },
		{
			style: {
				fill: "#1a1a1a",
				stroke: "#333333",
				strokeWidth: 2,
				borderRadius: 10,
			},
		},
		1,
		"Fond",
	);
	page.addWidget(fond);

	// Voyant rouge
	const yRouge = Y_START;
	const voyantRouge = HmiWidget.create(
		"indicator",
		CX - VOYANT_SIZE.width / 2,
		yRouge,
		VOYANT_SIZE,
		{
			variable: "rouge",
			label: "",
			onColor: "#ff2020",
			offColor: "#4a1010",
		},
		2,
		"Voyant rouge",
	);
	page.addWidget(voyantRouge);

	// Voyant orange
	const yOrange = yRouge + VOYANT_SIZE.height + VOYANT_GAP;
	const voyantOrange = HmiWidget.create(
		"indicator",
		CX - VOYANT_SIZE.width / 2,
		yOrange,
		VOYANT_SIZE,
		{
			variable: "orange",
			label: "",
			onColor: "#ff9900",
			offColor: "#4a3010",
		},
		3,
		"Voyant orange",
	);
	page.addWidget(voyantOrange);

	// Voyant vert
	const yVert = yOrange + VOYANT_SIZE.height + VOYANT_GAP;
	const voyantVert = HmiWidget.create(
		"indicator",
		CX - VOYANT_SIZE.width / 2,
		yVert,
		VOYANT_SIZE,
		{
			variable: "vert",
			label: "",
			onColor: "#20dd20",
			offColor: "#0a3010",
		},
		4,
		"Voyant vert",
	);
	page.addWidget(voyantVert);

	project.hmiPages[page.id] = page;

	return project;
}

/**
 * Version complète et simulable du feu tricolore :
 * GRAFCET à 3 étapes (une par couleur, la première initiale) avec temporisations,
 * et le même HMI que la version exercice.
 *
 * Séquence : E0 (initiale) vert 10s → E1 orange 2s → E2 rouge 10s → retour E0
 */
export function createTrafficLightSolution(): Project {
	const project = createTrafficLightProject();
	project.name = "Feu tricolore — solution";

	// Positions verticales : étapes et transitions alternées, espacées de 50 px
	const X = 200;
	const e0 = new StepBuilder()
		.id(createRandomId())
		.number(0)
		.initial()
		.position(X, 60)
		.build();
	const t0 = new TransitionBuilder()
		.id(createRandomId())
		.expression("t0/X0/10s")
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
	const e2 = new StepBuilder()
		.id(createRandomId())
		.number(2)
		.position(X, 260)
		.build();
	const t2 = new TransitionBuilder()
		.id(createRandomId())
		.expression("t2/X2/10s")
		.position(X, 310)
		.build();

	// Actions sur chaque étape active
	const a0 = new ActionBuilder()
		.id(createRandomId())
		.expression("vert")
		.type(ActionType.BOOLEAN_VARIABLE)
		.executionMode(ActionExecutionMode.CONTINUOUS)
		.position(X + 80, 60)
		.build();
	const a1 = new ActionBuilder()
		.id(createRandomId())
		.expression("orange")
		.type(ActionType.BOOLEAN_VARIABLE)
		.executionMode(ActionExecutionMode.CONTINUOUS)
		.position(X + 80, 160)
		.build();
	const a2 = new ActionBuilder()
		.id(createRandomId())
		.expression("rouge")
		.type(ActionType.BOOLEAN_VARIABLE)
		.executionMode(ActionExecutionMode.CONTINUOUS)
		.position(X + 80, 260)
		.build();

	const grafcet = new GrafcetBuilder()
		.id(createRandomId())
		.name("Feu tricolore")
		.format(DEFAULT_GRAFCET_FORMAT)
		.addSteps(e0, e1, e2)
		.addTransitions(t0, t1, t2)
		.addActions(a0, a1, a2)
		.addConnections(
			// Liaisons séquentielles étapes ↔ transitions
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
				e2,
				STEP_HANDLE_TARGET_PREDECESSOR,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				e2,
				STEP_HANDLE_SOURCE_SUCCESSOR,
				t2,
				TRANSITION_HANDLE_TARGET_PREDECESSOR,
			),
			// Bouclage t2 → e0
			ConnectionBuilder.betweenElements(
				createRandomId(),
				t2,
				TRANSITION_HANDLE_SOURCE_SUCCESSOR,
				e0,
				STEP_HANDLE_TARGET_PREDECESSOR,
			),
			// Liaisons étapes → actions
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
