import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import Action, {
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
import { HmiWidget, IndicatorData } from "@/schemas/hmi/hmi-widget.schema";
import Project from "@/schemas/project/project.schema";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import { createRandomId } from "@/ids";

const VOYANT_SIZE = { width: 50, height: 50 };
const VOYANT_GAP = 12;
const FEU_PADDING = 12;
const FEU_WIDTH = VOYANT_SIZE.width + 2 * FEU_PADDING;
const FEU_HEIGHT = 3 * VOYANT_SIZE.height + 2 * VOYANT_GAP + 2 * FEU_PADDING;

/** Centre du canvas */
const CX = 500;
const CY = 320;

/** Côté du rectangle de carrefour au centre */
const CROSSING_SIZE = 120;

/** Distance du centre du carrefour au centre d'un feu */
const FEU_OFFSET = CROSSING_SIZE / 2 + 20 + FEU_HEIGHT / 2;

type FeuConfig = {
	/** Mnémonique de base, ex. "NS1" → variables rougeNS1, orangeNS1, vertNS1 */
	key: string;
	label: string;
	/** Centre du feu sur le canvas */
	cx: number;
	cy: number;
};

const FEUX: FeuConfig[] = [
	{ key: "NS1", label: "Nord", cx: CX, cy: CY - FEU_OFFSET },
	{ key: "NS2", label: "Sud", cx: CX, cy: CY + FEU_OFFSET },
	{ key: "EO1", label: "Est", cx: CX + FEU_OFFSET, cy: CY },
	{ key: "EO2", label: "Ouest", cx: CX - FEU_OFFSET, cy: CY },
];

/** Construit les données d'un voyant : couleur allumée / éteinte selon la variable liée. */
function indicatorData(
	mnemonic: string,
	colorOn: string,
	colorOff: string,
): IndicatorData {
	return {
		variable: mnemonic,
		label: "",
		onColor: colorOn,
		offColor: colorOff,
	};
}

/**
 * Crée un projet "Carrefour de feux tricolores" pré-configuré :
 * — 12 variables de sortie booléennes (rouge/orange/vert × 4 feux : NS1, NS2, EO1, EO2)
 * — 1 page HMI avec 4 feux disposés autour d'un carrefour central
 * — aucun programme (l'étudiant l'écrit)
 */
export function createCrossroadsProject(): Project {
	const project = new Project(
		createRandomId(),
		"Carrefour de feux tricolores",
		"",
	);

	// — Variables de sortie ———————————————————————————————————————————————
	for (const { key } of FEUX) {
		project.variables.push(
			VariableBuilder.buildLogicOutput(createRandomId(), `rouge${key}`),
			VariableBuilder.buildLogicOutput(createRandomId(), `orange${key}`),
			VariableBuilder.buildLogicOutput(createRandomId(), `vert${key}`),
		);
	}

	// — Page HMI ——————————————————————————————————————————————————————————
	const page = new HmiPage(createRandomId(), "Carrefour", true);
	let stack = 0;

	// Rectangle de chaussée central
	page.addWidget(
		HmiWidget.create(
			"rectangle",
			CX - CROSSING_SIZE / 2,
			CY - CROSSING_SIZE / 2,
			{ width: CROSSING_SIZE, height: CROSSING_SIZE },
			{
				style: {
					fill: "#888888",
					stroke: "#666666",
					strokeWidth: 1,
					borderRadius: 0,
				},
			},
			stack++,
			"Chaussée",
		),
	);

	// Titre
	page.addWidget(
		HmiWidget.create(
			"text",
			CX - 130,
			16,
			{ width: 260, height: 28 },
			{
				text: "Carrefour de feux tricolores",
				style: { fontSize: 16, color: "#333333", align: "center" },
			},
			stack++,
			"Titre",
		),
	);

	// 4 feux
	for (const { key, label, cx, cy } of FEUX) {
		const feuX = cx - FEU_WIDTH / 2;
		const feuY = cy - FEU_HEIGHT / 2;

		// Fond du feu
		page.addWidget(
			HmiWidget.create(
				"rectangle",
				feuX,
				feuY,
				{ width: FEU_WIDTH, height: FEU_HEIGHT },
				{
					style: {
						fill: "#1a1a1a",
						stroke: "#333333",
						strokeWidth: 2,
						borderRadius: 8,
					},
				},
				stack++,
				`Fond ${label}`,
			),
		);

		// Étiquette
		page.addWidget(
			HmiWidget.create(
				"text",
				feuX,
				feuY - 24,
				{ width: FEU_WIDTH, height: 20 },
				{
					text: label,
					style: { fontSize: 12, color: "#555555", align: "center" },
				},
				stack++,
				`Étiquette ${label}`,
			),
		);

		// Voyants rouge / orange / vert
		const colors: Array<{ suffix: string; colorOn: string; colorOff: string }> =
			[
				{ suffix: "rouge", colorOn: "#ff2020", colorOff: "#4a1010" },
				{ suffix: "orange", colorOn: "#ff9900", colorOff: "#4a3010" },
				{ suffix: "vert", colorOn: "#20dd20", colorOff: "#0a3010" },
			];

		colors.forEach(({ suffix, colorOn, colorOff }, i) => {
			const vx = cx - VOYANT_SIZE.width / 2;
			const vy = feuY + FEU_PADDING + i * (VOYANT_SIZE.height + VOYANT_GAP);
			const mnemonic = `${suffix}${key}`;
			page.addWidget(
				HmiWidget.create(
					"indicator",
					vx,
					vy,
					VOYANT_SIZE,
					indicatorData(mnemonic, colorOn, colorOff),
					stack++,
					`${suffix} ${label}`,
				),
			);
		});
	}

	project.hmiPages[page.id] = page;

	return project;
}

/**
 * Version complète et simulable du carrefour de feux tricolores.
 *
 * Séquence à 6 phases (une étape par phase, la première initiale) :
 *   E0 (initiale) : NS vert + EO rouge (10 s)
 *   E1            : NS orange + EO rouge (2 s)
 *   E2            : tout rouge — dégagement du carrefour (2 s)
 *   E3            : NS rouge + EO vert (10 s)
 *   E4            : NS rouge + EO orange (2 s)
 *   E5            : tout rouge — dégagement du carrefour (2 s) → retour E0
 *
 * Les phases de tout-rouge (E2, E5) laissent évacuer les véhicules engagés à l'orange
 * avant de donner le vert à l'axe perpendiculaire.
 */
export function createCrossroadsSolution(): Project {
	const project = createCrossroadsProject();
	project.name = "Carrefour de feux tricolores — solution";

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
		.expression("t2/X2/2s")
		.position(X, 310)
		.build();
	const e3 = new StepBuilder()
		.id(createRandomId())
		.number(3)
		.position(X, 360)
		.build();
	const t3 = new TransitionBuilder()
		.id(createRandomId())
		.expression("t3/X3/10s")
		.position(X, 410)
		.build();
	const e4 = new StepBuilder()
		.id(createRandomId())
		.number(4)
		.position(X, 460)
		.build();
	const t4 = new TransitionBuilder()
		.id(createRandomId())
		.expression("t4/X4/2s")
		.position(X, 510)
		.build();
	const e5 = new StepBuilder()
		.id(createRandomId())
		.number(5)
		.position(X, 560)
		.build();
	const t5 = new TransitionBuilder()
		.id(createRandomId())
		.expression("t5/X5/2s")
		.position(X, 610)
		.build();

	// Actions : une action booléenne continue par variable activée dans chaque phase.
	// Les actions d'une même étape sont alignées horizontalement (une colonne par action)
	// pour ne pas se chevaucher.
	type ActionSpec = {
		id: string;
		mnemonic: string;
		stepEl: ReturnType<StepBuilder["build"]>;
	};
	const actionSpecs: ActionSpec[] = [
		// Phase 1 (E0) : NS vert, EO rouge
		{ id: createRandomId(), mnemonic: "vertNS1", stepEl: e0 },
		{ id: createRandomId(), mnemonic: "vertNS2", stepEl: e0 },
		{ id: createRandomId(), mnemonic: "rougeEO1", stepEl: e0 },
		{ id: createRandomId(), mnemonic: "rougeEO2", stepEl: e0 },
		// Phase 2 (E1) : NS orange, EO rouge
		{ id: createRandomId(), mnemonic: "orangeNS1", stepEl: e1 },
		{ id: createRandomId(), mnemonic: "orangeNS2", stepEl: e1 },
		{ id: createRandomId(), mnemonic: "rougeEO1", stepEl: e1 },
		{ id: createRandomId(), mnemonic: "rougeEO2", stepEl: e1 },
		// Phase 3 (E2) : tout rouge
		{ id: createRandomId(), mnemonic: "rougeNS1", stepEl: e2 },
		{ id: createRandomId(), mnemonic: "rougeNS2", stepEl: e2 },
		{ id: createRandomId(), mnemonic: "rougeEO1", stepEl: e2 },
		{ id: createRandomId(), mnemonic: "rougeEO2", stepEl: e2 },
		// Phase 4 (E3) : NS rouge, EO vert
		{ id: createRandomId(), mnemonic: "rougeNS1", stepEl: e3 },
		{ id: createRandomId(), mnemonic: "rougeNS2", stepEl: e3 },
		{ id: createRandomId(), mnemonic: "vertEO1", stepEl: e3 },
		{ id: createRandomId(), mnemonic: "vertEO2", stepEl: e3 },
		// Phase 5 (E4) : NS rouge, EO orange
		{ id: createRandomId(), mnemonic: "rougeNS1", stepEl: e4 },
		{ id: createRandomId(), mnemonic: "rougeNS2", stepEl: e4 },
		{ id: createRandomId(), mnemonic: "orangeEO1", stepEl: e4 },
		{ id: createRandomId(), mnemonic: "orangeEO2", stepEl: e4 },
		// Phase 6 (E5) : tout rouge
		{ id: createRandomId(), mnemonic: "rougeNS1", stepEl: e5 },
		{ id: createRandomId(), mnemonic: "rougeNS2", stepEl: e5 },
		{ id: createRandomId(), mnemonic: "rougeEO1", stepEl: e5 },
		{ id: createRandomId(), mnemonic: "rougeEO2", stepEl: e5 },
	];

	const ACTION_COLUMN_STEP = Action.DEFAULT_DIMENSIONS.width;
	const columnByStep = new Map<string, number>();
	const actions = actionSpecs.map((s) => {
		const column = columnByStep.get(s.stepEl.id) ?? 0;
		columnByStep.set(s.stepEl.id, column + 1);
		return new ActionBuilder()
			.id(s.id)
			.expression(s.mnemonic)
			.type(ActionType.BOOLEAN_VARIABLE)
			.executionMode(ActionExecutionMode.CONTINUOUS)
			.position(X + 80 + column * ACTION_COLUMN_STEP, s.stepEl.position.y)
			.build();
	});

	const builder = new GrafcetBuilder()
		.id(createRandomId())
		.name("Carrefour de feux tricolores")
		.format(DEFAULT_GRAFCET_FORMAT)
		.addSteps(e0, e1, e2, e3, e4, e5)
		.addTransitions(t0, t1, t2, t3, t4, t5)
		.addActions(...actions);

	// Liaisons séquentielles étapes ↔ transitions
	const seqPairs: [
		ReturnType<StepBuilder["build"]> | ReturnType<TransitionBuilder["build"]>,
		ReturnType<StepBuilder["build"]> | ReturnType<TransitionBuilder["build"]>,
	][] = [
		[e0, t0],
		[t0, e1],
		[e1, t1],
		[t1, e2],
		[e2, t2],
		[t2, e3],
		[e3, t3],
		[t3, e4],
		[e4, t4],
		[t4, e5],
		[e5, t5],
	];
	for (const [src, tgt] of seqPairs) {
		const srcHandle =
			src.type === "step"
				? STEP_HANDLE_SOURCE_SUCCESSOR
				: TRANSITION_HANDLE_SOURCE_SUCCESSOR;
		const tgtHandle =
			tgt.type === "step"
				? STEP_HANDLE_TARGET_PREDECESSOR
				: TRANSITION_HANDLE_TARGET_PREDECESSOR;
		builder.addConnection(
			ConnectionBuilder.betweenElements(
				createRandomId(),
				src,
				srcHandle,
				tgt,
				tgtHandle,
			),
		);
	}
	// Bouclage t5 → e0
	builder.addConnection(
		ConnectionBuilder.betweenElements(
			createRandomId(),
			t5,
			TRANSITION_HANDLE_SOURCE_SUCCESSOR,
			e0,
			STEP_HANDLE_TARGET_PREDECESSOR,
		),
	);

	// Liaisons étapes → actions
	for (const [i, spec] of actionSpecs.entries()) {
		builder.addConnection(
			ConnectionBuilder.betweenElements(
				createRandomId(),
				spec.stepEl,
				STEP_HANDLE_SOURCE_ACTION,
				actions[i],
				ACTION_HANDLE_TARGET_STEP,
			),
		);
	}

	project.addProgram(builder.build());
	return project;
}
