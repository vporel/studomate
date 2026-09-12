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
	getElementHeight,
	LadderElement,
} from "@/schemas/ladder/element.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Section from "@/schemas/ladder/section.schema";
import Project from "@/schemas/project/project.schema";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";

/** Course d'un vérin, du rentré (0) au sorti (CYL_MAX), en pixels d'animation et en unités du
 * modèle de partie opérative. */
const CYL_MAX = 192;
/** Distance parcourue par une caisse sur le tapis T1 avant d'atteindre le poste de détection. */
const T1_MAX = 516;
/** Base de temps système qui cadence toute la cinématique : les mouvements avancent d'un `PAS`
 * par impulsion (toutes les 200 ms de temps simulé), et non par cycle automate — le procédé
 * garde la même vitesse quel que soit le temps de scan. */
const TICK = "_SYS_TB_200ms";
/** Avance d'une caisse sur T1 et de chaque vérin par impulsion de `TICK`. Divise toutes les
 * courses (T1_MAX, CYL_MAX, CAISSE_Y_*, CAISSE_X_MAX) pour que la caisse s'arrête pile sur sa
 * position cible ; 5 impulsions par seconde de temps simulé. */
const PAS = 12;
/** Descente de la caisse (px) sous la poussée de P1 : niveau d'éjection de P2 (caisses basses). */
const CAISSE_Y_P2 = CYL_MAX;
/** Niveau d'éjection de P3 (caisses hautes), plus bas dans le canal. */
const CAISSE_Y_P3 = 276;
/** Décalage latéral maximal de la caisse lors de son éjection par P2 ou P3. */
const CAISSE_X_MAX = 120;

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
 * deux).
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
 * Modèle de partie opérative du poste de tri de caisses, en Ladder — **fourni, à ne pas
 * modifier**. Le simulateur n'a pas de modèle physique : ce programme le remplace. À chaque
 * cycle il fait naître une caisse sur T1 sur appui de « Nouvelle caisse » (avec la hauteur
 * choisie par l'interrupteur), la convoie jusqu'au poste, intègre les commandes des trois
 * vérins P1/P2/P3 en positions, en déduit les capteurs de présence et de fin de course
 * utilisés par le GRAFCET, puis calcule les grandeurs d'animation de la vue HMI.
 */
function buildOperativePartLadder(): Ladder {
	// Colonnes espacées de 3 (`COL_STEP`) : deux cellules vides après un élément d'une colonne
	// (contact, compare), une après un bloc-boîte de deux colonnes (assign, arithmetic). Sans
	// cet écart, les mnémoniques auto-dimensionnés des contacts et les opérandes des blocs se
	// chevauchent sur la grille de 60 px.
	const COL_STEP = 3;
	const col = (index: number) => 1 + index * COL_STEP;

	const generation = buildLadderSection(
		"Génération caisse",
		"Sur appui de `dcy_caisse` : remet toujours `caisse_presente` à zéro puis, aucune caisse n'étant alors présente, place une caisse neuve en entrée de T1 et remet à zéro son déplacement. Le reset inconditionnel évite le blocage si un cycle précédent n'a pas mené P1 en butée (`caisse_presente` resté collé).",
		(rung) => {
			rung((r) => [
				createRailTerminalElement(r),
				createContactElement("dcy_caisse", "NO", r, col(0)),
				createCoilElement("caisse_presente", "reset", r, col(1)),
			]);
			rung((r) => [
				createRailTerminalElement(r),
				createContactElement("dcy_caisse", "NO", r, col(0)),
				createContactElement("caisse_presente", "NF", r, col(1)),
				createAssignBlockElement(r, col(2), { out: "pos_caisse", in: "0" }),
			]);
			rung((r) => [
				createRailTerminalElement(r),
				createContactElement("dcy_caisse", "NO", r, col(0)),
				createContactElement("caisse_presente", "NF", r, col(1)),
				createAssignBlockElement(r, col(2), { out: "caisse_y", in: "0" }),
			]);
			rung((r) => [
				createRailTerminalElement(r),
				createContactElement("dcy_caisse", "NO", r, col(0)),
				createContactElement("caisse_presente", "NF", r, col(1)),
				createAssignBlockElement(r, col(2), { out: "caisse_x_extra", in: "0" }),
			]);
			rung((r) => [
				createRailTerminalElement(r),
				createContactElement("dcy_caisse", "NO", r, col(0)),
				createContactElement("caisse_presente", "NF", r, col(1)),
				createCoilElement("caisse_presente", "set", r, col(2)),
			]);
		},
	);

	const convoyage = buildLadderSection(
		"Convoyage T1",
		"La caisse avance sur T1 tant que `Cmd_T1` est actif et qu'elle n'a pas atteint le poste.",
		(rung) => {
			rung((r) => [
				createRailTerminalElement(r),
				createContactElement(TICK, "NO", r, col(0)),
				createContactElement("caisse_presente", "NO", r, col(1)),
				createContactElement("Cmd_T1", "NO", r, col(2)),
				createCompareBlockElement(r, col(3), {
					in1: "pos_caisse",
					in2: `${T1_MAX}`,
					operator: "<",
				}),
				createArithmeticBlockElement(r, col(4), {
					in1: "pos_caisse",
					in2: `${PAS}`,
					out: "pos_caisse",
					operator: "+",
				}),
			]);
		},
	);

	const verins = buildLadderSection(
		"Vérins",
		"Intègre `Cmd_Px_out` / `Cmd_Px_in` en positions `pos_px`, puis en déduit les fins de course `cpt_px_out` / `cpt_px_in`.",
		(rung) => {
			(["p1", "p2", "p3"] as const).forEach((p) => {
				const cmd = `Cmd_${p.toUpperCase()}`;
				rung((r) => [
					createRailTerminalElement(r),
					createContactElement(TICK, "NO", r, col(0)),
					createContactElement(`${cmd}_out`, "NO", r, col(1)),
					createCompareBlockElement(r, col(2), {
						in1: `pos_${p}`,
						in2: `${CYL_MAX}`,
						operator: "<",
					}),
					createArithmeticBlockElement(r, col(3), {
						in1: `pos_${p}`,
						in2: `${PAS}`,
						out: `pos_${p}`,
						operator: "+",
					}),
				]);
				rung((r) => [
					createRailTerminalElement(r),
					createContactElement(TICK, "NO", r, col(0)),
					createContactElement(`${cmd}_in`, "NO", r, col(1)),
					createCompareBlockElement(r, col(2), {
						in1: `pos_${p}`,
						in2: "0",
						operator: ">",
					}),
					createArithmeticBlockElement(r, col(3), {
						in1: `pos_${p}`,
						in2: `${PAS}`,
						out: `pos_${p}`,
						operator: "-",
					}),
				]);
				rung((r) => [
					createRailTerminalElement(r),
					createCompareBlockElement(r, col(0), {
						in1: `pos_${p}`,
						in2: `${CYL_MAX}`,
						operator: ">=",
					}),
					createCoilElement(`cpt_${p}_out`, "normal", r, col(1)),
				]);
				rung((r) => [
					createRailTerminalElement(r),
					createCompareBlockElement(r, col(0), {
						in1: `pos_${p}`,
						in2: "0",
						operator: "<=",
					}),
					createCoilElement(`cpt_${p}_in`, "normal", r, col(1)),
				]);
			});
		},
	);

	const capteurs = buildLadderSection(
		"Capteurs caisse",
		"Présence caisse au poste (`cpt_psce_c`), caisse haute (`cpt_c_hte`), caisse transférée par P1 (`cpt_psce_p2`), et évacuation de T1 une fois poussée.",
		(rung) => {
			rung((r) => [
				createRailTerminalElement(r),
				createContactElement("caisse_presente", "NO", r, col(0)),
				createCompareBlockElement(r, col(1), {
					in1: "pos_caisse",
					in2: `${T1_MAX}`,
					operator: ">=",
				}),
				createCoilElement("cpt_psce_c", "normal", r, col(2)),
			]);
			rung((r) => [
				createRailTerminalElement(r),
				createContactElement("cpt_psce_c", "NO", r, col(0)),
				createContactElement("sel_caisse_haute", "NO", r, col(1)),
				createCoilElement("cpt_c_hte", "normal", r, col(2)),
			]);
			rung((r) => [
				createRailTerminalElement(r),
				createContactElement("cpt_p1_out", "NO", r, col(0)),
				createCoilElement("cpt_psce_p2", "normal", r, col(1)),
			]);
			rung((r) => [
				createRailTerminalElement(r),
				createContactElement("cpt_p1_out", "NO", r, col(0)),
				createCoilElement("caisse_presente", "reset", r, col(1)),
			]);
		},
	);

	const positionCaisse = buildLadderSection(
		"Position caisse",
		"Déplacement cumulé de la caisse : P1 la descend au niveau de P2 ; si P3 est commandé, elle bascule au niveau de P3 ; P2 ou P3 l'éjectent ensuite vers la droite. La position reste acquise même après rentrée des vérins.",
		(rung) => {
			// P1 descend la caisse jusqu'au niveau d'éjection de P2
			rung((r) => [
				createRailTerminalElement(r),
				createContactElement(TICK, "NO", r, col(0)),
				createContactElement("Cmd_P1_out", "NO", r, col(1)),
				createCompareBlockElement(r, col(2), {
					in1: "caisse_y",
					in2: `${CAISSE_Y_P2}`,
					operator: "<",
				}),
				createArithmeticBlockElement(r, col(3), {
					in1: "caisse_y",
					in2: `${PAS}`,
					out: "caisse_y",
					operator: "+",
				}),
			]);
			// Caisse haute : dès que P3 est commandé, elle descend au niveau de P3
			rung((r) => [
				createRailTerminalElement(r),
				createContactElement("Cmd_P3_out", "NO", r, col(0)),
				createCompareBlockElement(r, col(1), {
					in1: "caisse_y",
					in2: `${CAISSE_Y_P3}`,
					operator: "<",
				}),
				createAssignBlockElement(r, col(2), {
					out: "caisse_y",
					in: `${CAISSE_Y_P3}`,
				}),
			]);
			// Éjection latérale par P2 (caisses basses)
			rung((r) => [
				createRailTerminalElement(r),
				createContactElement(TICK, "NO", r, col(0)),
				createContactElement("Cmd_P2_out", "NO", r, col(1)),
				createCompareBlockElement(r, col(2), {
					in1: "caisse_x_extra",
					in2: `${CAISSE_X_MAX}`,
					operator: "<",
				}),
				createArithmeticBlockElement(r, col(3), {
					in1: "caisse_x_extra",
					in2: `${PAS}`,
					out: "caisse_x_extra",
					operator: "+",
				}),
			]);
			// Éjection latérale par P3 (caisses hautes), une fois au niveau de P3
			rung((r) => [
				createRailTerminalElement(r),
				createContactElement(TICK, "NO", r, col(0)),
				createContactElement("Cmd_P3_out", "NO", r, col(1)),
				createCompareBlockElement(r, col(2), {
					in1: "caisse_y",
					in2: `${CAISSE_Y_P3}`,
					operator: ">=",
				}),
				createCompareBlockElement(r, col(3), {
					in1: "caisse_x_extra",
					in2: `${CAISSE_X_MAX}`,
					operator: "<",
				}),
				createArithmeticBlockElement(r, col(4), {
					in1: "caisse_x_extra",
					in2: `${PAS}`,
					out: "caisse_x_extra",
					operator: "+",
				}),
			]);
		},
	);

	const animation = buildLadderSection(
		"Animation",
		"Grandeurs consommées par la vue HMI : abscisse de la caisse (course T1 + éjection latérale) et translation de chaque vérin.",
		(rung) => {
			rung((r) => [
				createRailTerminalElement(r),
				createArithmeticBlockElement(r, col(1), {
					in1: "pos_caisse",
					in2: "caisse_x_extra",
					out: "caisse_dx",
					operator: "+",
				}),
			]);
			rung((r) => [
				createRailTerminalElement(r),
				createAssignBlockElement(r, col(1), { out: "p1_dy", in: "pos_p1" }),
			]);
			rung((r) => [
				createRailTerminalElement(r),
				createAssignBlockElement(r, col(1), { out: "p2_dx", in: "pos_p2" }),
			]);
			rung((r) => [
				createRailTerminalElement(r),
				createAssignBlockElement(r, col(1), { out: "p3_dx", in: "pos_p3" }),
			]);
		},
	);

	return new Ladder(createRandomId(), "Partie opérative", [
		generation,
		convoyage,
		verins,
		positionCaisse,
		capteurs,
		animation,
	]);
}

/** Page HMI commune : tapis T1 horizontal en haut, canal d'éjection vertical, sorties
 * « caisses basses » (niveau P2) et « caisses hautes » (niveau P3, plus bas) à droite du canal,
 * vérins et caisse animés, cadre de voyants regroupés par organe, pupitre. */
function buildCartonSortingPage(): HmiPage {
	const page = new HmiPage(createRandomId(), "Poste de tri", true);
	let stack = 0;

	const addWidget = (
		type: Parameters<typeof HmiWidget.create>[0],
		x: number,
		y: number,
		size: { width: number; height: number },
		data: Parameters<typeof HmiWidget.create>[4],
		name: string,
	) => page.addWidget(HmiWidget.create(type, x, y, size, data, stack++, name));

	const label = (text: string, x: number, y: number, w = 90) =>
		addWidget(
			"text",
			x,
			y,
			{ width: w, height: 18 },
			{ text, style: { fontSize: 11, color: "#555555", align: "center" } },
			`Étiquette ${text}`,
		);
	const voyant = (mnemonic: string, lbl: string, x: number, y: number) =>
		addWidget(
			"indicator",
			x,
			y,
			{ width: 26, height: 26 },
			{ variable: mnemonic, label: lbl },
			`Voyant ${mnemonic}`,
		);

	addWidget(
		"text",
		44,
		12,
		{ width: 320, height: 24 },
		{
			text: "Poste de tri de caisses",
			style: { fontSize: 16, color: "#333333", align: "left" },
		},
		"Titre",
	);

	// Canal d'éjection vertical (clair) — dessiné sous le tapis T1
	addWidget(
		"rectangle",
		554,
		88,
		{ width: 66, height: 316 },
		{ style: { fill: "#e3e7ea", stroke: "#b0bec5", strokeWidth: 2, borderRadius: 0 } },
		"Canal d'éjection",
	);
	// Tapis T1 (entrée, horizontal, plus foncé) — au-dessus du canal, bord droit aligné sur lui
	addWidget(
		"rectangle",
		40,
		66,
		{ width: 580, height: 44 },
		{ style: { fill: "#c2cbd0", stroke: "#8b9aa3", strokeWidth: 2, borderRadius: 0 } },
		"Tapis T1",
	);
	// Sortie caisses basses (niveau de P2)
	addWidget(
		"rectangle",
		622,
		256,
		{ width: 160, height: 56 },
		{ style: { fill: "#c8e6c9", stroke: "#81c784", strokeWidth: 2, borderRadius: 4 } },
		"Sortie caisses basses",
	);
	label("Caisses basses", 647, 234, 130);
	// Sortie caisses hautes (niveau de P3, collée au bas du canal)
	addWidget(
		"rectangle",
		622,
		340,
		{ width: 160, height: 56 },
		{ style: { fill: "#ffe0b2", stroke: "#ffb74d", strokeWidth: 2, borderRadius: 4 } },
		"Sortie caisses hautes",
	);
	label("Caisses hautes", 647, 318, 130);

	// Vérins
	addWidget(
		"rectangle",
		562,
		22,
		{ width: 54, height: 44 },
		{
			style: { fill: "#546e7a", stroke: "#37474f", strokeWidth: 2, borderRadius: 2 },
			animations: { position: { yVariable: "p1_dy" } },
		},
		"Vérin P1",
	);
	addWidget(
		"rectangle",
		494,
		262,
		{ width: 54, height: 44 },
		{
			style: { fill: "#607d8b", stroke: "#37474f", strokeWidth: 2, borderRadius: 2 },
			animations: { position: { xVariable: "p2_dx" } },
		},
		"Vérin P2",
	);
	addWidget(
		"rectangle",
		494,
		346,
		{ width: 54, height: 44 },
		{
			style: { fill: "#607d8b", stroke: "#37474f", strokeWidth: 2, borderRadius: 2 },
			animations: { position: { xVariable: "p3_dx" } },
		},
		"Vérin P3",
	);

	// Caisse : translation (caisse_dx, caisse_y), couleur selon la hauteur choisie
	addWidget(
		"rectangle",
		50,
		76,
		{ width: 32, height: 32 },
		{
			style: { fill: "#64b5f6", stroke: "#1976d2", strokeWidth: 2, borderRadius: 2 },
			animations: {
				position: { xVariable: "caisse_dx", yVariable: "caisse_y" },
				style: {
					variable: "sel_caisse_haute",
					rows: [
						{ value: 0, properties: { fill: "#64b5f6", stroke: "#1976d2" } },
						{ value: 1, properties: { fill: "#ffa726", stroke: "#ef6c00" } },
					],
				},
			},
		},
		"Caisse",
	);

	// Étiquettes des objets, posées à côté d'eux
	label("T1", 48, 80, 30);
	label("T2 / T3", 556, 116, 60);
	label("P1", 622, 30, 30);
	label("P2", 452, 274, 34);
	label("P3", 452, 358, 34);

	// Cadre des voyants (en bas à gauche, sous le tapis), regroupés par organe
	const vx = 40;
	addWidget(
		"rectangle",
		vx,
		410,
		{ width: 480, height: 192 },
		{ style: { fill: "#f6f7f8", stroke: "#cfd4d8", strokeWidth: 1, borderRadius: 4 } },
		"Cadre voyants",
	);
	label("Voyants", vx + 16, 416, 70);
	label("cmd +", vx + 97, 436, 52);
	label("cmd −", vx + 163, 436, 52);
	label("sorti", vx + 229, 436, 52);
	label("rentré", vx + 295, 436, 52);
	([
		["P1", "Cmd_P1_out", "Cmd_P1_in", "cpt_p1_out", "cpt_p1_in"],
		["P2", "Cmd_P2_out", "Cmd_P2_in", "cpt_p2_out", "cpt_p2_in"],
		["P3", "Cmd_P3_out", "Cmd_P3_in", "cpt_p3_out", "cpt_p3_in"],
	] as const).forEach(([name, cmdOut, cmdIn, cptOut, cptIn], i) => {
		const y = 458 + i * 34;
		label(name, vx + 16, y + 2, 34);
		voyant(cmdOut, "", vx + 110, y);
		voyant(cmdIn, "", vx + 176, y);
		voyant(cptOut, "", vx + 242, y);
		voyant(cptIn, "", vx + 308, y);
	});
	label("Tapis", vx + 16, 564, 40);
	voyant("Cmd_T1", "", vx + 66, 560);
	label("T1", vx + 92, 564, 22);
	voyant("Cmd_T2T3", "", vx + 124, 560);
	label("T2 / T3", vx + 150, 564, 44);
	label("Poste", vx + 212, 564, 40);
	voyant("cpt_psce_c", "", vx + 260, 560);
	label("prés.", vx + 286, 564, 34);
	voyant("cpt_c_hte", "", vx + 328, 560);
	label("haute", vx + 354, 564, 38);
	voyant("cpt_psce_p2", "", vx + 400, 560);
	label("transf.", vx + 426, 564, 44);

	// Pupitre
	const colX = 800;
	addWidget(
		"push-button",
		colX,
		42,
		{ width: 150, height: 40 },
		{ variable: "dcy", label: "Départ cycle" },
		"BP départ",
	);
	addWidget(
		"toggle-switch",
		colX,
		104,
		{ width: 150, height: 40 },
		{ variable: "sel_caisse_haute", label: "Caisse haute" },
		"Sélecteur hauteur",
	);
	addWidget(
		"push-button",
		colX,
		188,
		{ width: 150, height: 40 },
		{ variable: "dcy_caisse", label: "Nouvelle caisse" },
		"BP nouvelle caisse",
	);
	addWidget(
		"numeric-display",
		colX,
		250,
		{ width: 150, height: 44 },
		{ variable: "C", label: "Caisses triées", decimalPlaces: 0 },
		"Compteur caisses",
	);

	return page;
}

const MEMORY_BOOLS = [
	"caisse_presente",
	"cpt_psce_c",
	"cpt_c_hte",
	"cpt_psce_p2",
	"cpt_p1_out",
	"cpt_p1_in",
	"cpt_p2_out",
	"cpt_p2_in",
	"cpt_p3_out",
	"cpt_p3_in",
];

const MEMORY_INTS = [
	"pos_caisse",
	"pos_p1",
	"pos_p2",
	"pos_p3",
	"caisse_dx",
	"caisse_y",
	"caisse_x_extra",
	"p1_dy",
	"p2_dx",
	"p3_dx",
];

const OUTPUTS = [
	"Cmd_T1",
	"Cmd_T2T3",
	"Cmd_P1_out",
	"Cmd_P1_in",
	"Cmd_P2_out",
	"Cmd_P2_in",
	"Cmd_P3_out",
	"Cmd_P3_in",
];

/**
 * Crée un projet "Poste de tri de caisses" pré-configuré :
 * — entrées : `dcy` (départ cycle), `dcy_caisse` (nouvelle caisse), `sel_caisse_haute` (hauteur)
 * — sorties : `Cmd_T1`, `Cmd_T2T3`, `Cmd_Px_out` / `Cmd_Px_in` (vérins P1/P2/P3)
 * — compteur `C` et capteurs / grandeurs d'animation en mémoire, calculés par le modèle de
 *   partie opérative (Ladder « Partie opérative », fourni et référencé par le Main)
 * — 1 page HMI (tapis, vérins et caisse animés, pupitre, compteur, voyants)
 * — pas de GRAFCET de commande : c'est ce que l'étudiant écrit
 */
export function createCartonSortingProject(): Project {
	const project = new Project(createRandomId(), "Poste de tri de caisses", "");

	project.variables.push(
		VariableBuilder.buildLogicInput(createRandomId(), "dcy"),
		VariableBuilder.buildLogicInput(createRandomId(), "dcy_caisse"),
		VariableBuilder.buildLogicInput(createRandomId(), "sel_caisse_haute"),
		...OUTPUTS.map((m) => VariableBuilder.buildLogicOutput(createRandomId(), m)),
		...MEMORY_BOOLS.map((m) => VariableBuilder.buildMemoryBool(createRandomId(), m)),
		...MEMORY_INTS.map((m) => VariableBuilder.buildMemoryInt(createRandomId(), m)),
	);
	const counter = VariableBuilder.buildMemoryInt(createRandomId(), "C");
	counter.comment = "compteur de caisses triées";
	project.variables.push(counter);

	const operativePart = buildOperativePartLadder();
	project.addProgram(operativePart);
	const [mainSection] = project.main.sections;
	const mainRail = createRailTerminalElement(0);
	const mainBlock = createUserProgramBlockElement(operativePart.id, 0, 0);
	project.main.addElements(mainSection.id, [mainRail, mainBlock]);
	project.main.addConnections(mainSection.id, wireInSeries([mainRail, mainBlock]));

	const page = buildCartonSortingPage();
	project.hmiPages[page.id] = page;

	return project;
}

/**
 * Version complète et simulable du poste de tri.
 *
 * GRAFCET "Commande" :
 *   X0 (initial, `Cmd_T2T3` reset, `C := 0`) ─[dcy]→ X1 (`Cmd_T2T3` set, `Cmd_T1`)
 *   X1 ─OU─ [cpt_psce_c ET NON cpt_c_hte] → X11→X12→X13 (poussée P1 puis P2)
 *          [cpt_psce_c ET cpt_c_hte]      → X21→X22→X23 (poussée P1 puis P3)
 *      convergence → X4 (`Cmd_P1_in`, `C := C + 1`)
 *   X4 ─OU─ [C < 2 ET cpt_p1_in]  → X5 ─[VRAI]→ renvoi vers X1
 *          [C >= 2 ET cpt_p1_in]  → X6 ─[VRAI]→ renvoi vers X0
 *
 * Les capteurs proviennent du modèle de partie opérative : après `dcy` puis chaque appui sur
 * « Nouvelle caisse », le tri se déroule sans autre intervention.
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
	const t2122 = trans("cpt_p1_out", XR, ROW * 7);
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

	const aResetT2T3 = boolAction("Cmd_T2T3", CL + A1, ROW, ActionExecutionMode.RESET);
	const aInitC = numAction("C := 0", CL + A2, ROW, ActionExecutionMode.CONTINUOUS);
	const aSetT2T3 = boolAction("Cmd_T2T3", CL + A1, ROW * 3, ActionExecutionMode.SET);
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
	const aIncC = numAction("C := C + 1", CL + A2, ROW * 13, ActionExecutionMode.RISING_EDGE);

	const [d1a, d1b] = div1.data.branchesOrder;
	const [c1a, c1b] = conv1.data.branchesOrder;
	const [d2a, d2b] = div2.data.branchesOrder;

	type El =
		| ReturnType<typeof step>
		| ReturnType<typeof trans>;
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
