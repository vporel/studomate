import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import JunctionOrStartBuilder from "@/schemas/grafcet/builders/junction-or-start.builder";
import StepReferralSourceBuilder from "@/schemas/grafcet/builders/step-referral-source.builder";
import { STEP_REFERRAL_SOURCE_HANDLE_TARGET_PREDECESSOR } from "@/schemas/grafcet/step-referral-source.schema";
import { JUNCTION_HANDLE_PIVOT } from "@/schemas/grafcet/junction.schema";
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
import ParkingDescriptor from "@/3d-scenes/parking/v1/parking.descriptor";
import { PARKING_CAPACITY } from "@/3d-scenes/parking/v1/parking.model";
import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import { PUSH_BUTTON_NO_BEHAVIOR } from "@/schemas/variable/input-behavior";
import { createRandomId } from "@/ids";
import type { Locale } from "@/i18n/config";
import createTemplateText from "@/templates/template-text";

/** Nombre de places du parking (celles de la scène 3D), borne du compteur `places`. */
export const CAPACITE = PARKING_CAPACITY;

export function createParkingVariables(_locale: Locale = "fr"): Variable[] {
	return [
		VariableBuilder.buildLogicInput(
			createRandomId(),
			"dem_entree",
			PUSH_BUTTON_NO_BEHAVIOR,
		),
		VariableBuilder.buildLogicInput(
			createRandomId(),
			"dem_sortie",
			PUSH_BUTTON_NO_BEHAVIOR,
		),
		VariableBuilder.buildLogicInput(
			createRandomId(),
			"passage",
			PUSH_BUTTON_NO_BEHAVIOR,
		),
		VariableBuilder.buildLogicOutput(createRandomId(), "barriere"),
		VariableBuilder.buildLogicOutput(createRandomId(), "complet"),
		VariableBuilder.buildMemoryInt(createRandomId(), "places"),
	];
}

/**
 * Crée un projet "Parking à barrière" pré-configuré :
 * — 3 entrées booléennes fournies par la scène 3D : `dem_entree` et `dem_sortie` (voiture en
 *   attente devant la barrière d'entrée / de sortie) et `passage` (cellule sous une barrière,
 *   vraie tant qu'une voiture s'y trouve)
 * — 3 sorties : `barriere_entree`, `barriere_sortie` (ouverture) et `complet` (voyant)
 * — 1 mémoire entière `places` (compteur de véhicules, affiché sur le pupitre 3D)
 * — scène 3D « Parking » câblée sur ces variables
 * — aucun programme (l'étudiant l'écrit)
 */
export function createParkingProject(locale: Locale = "fr"): Project {
	const t = createTemplateText("parking", locale);
	const project = new Project(createRandomId(), t("projectName"), "");

	project.variables.push(
		VariableBuilder.buildLogicInput(createRandomId(), "dem_entree"),
		VariableBuilder.buildLogicInput(createRandomId(), "dem_sortie"),
		VariableBuilder.buildLogicInput(createRandomId(), "passage"),
		VariableBuilder.buildLogicOutput(createRandomId(), "barriere_entree"),
		VariableBuilder.buildLogicOutput(createRandomId(), "barriere_sortie"),
		VariableBuilder.buildLogicOutput(createRandomId(), "complet"),
		VariableBuilder.buildMemoryInt(createRandomId(), "places"),
	);

	const variableIdByMnemonic = new Map(
		project.variables.map((variable) => [variable.mnemonic, variable.id]),
	);
	project.scene3d = {
		sceneId: ParkingDescriptor.id,
		sceneVersion: ParkingDescriptor.version,
		bindings: Object.fromEntries(
			ParkingDescriptor.points.map((point) => [
				point.id,
				variableIdByMnemonic.get(point.suggestedMnemonic)!,
			]),
		),
	};

	return project;
}

/**
 * Version complète et simulable du parking à barrière.
 *
 * GRAFCET "Commande" — sélection de séquence entrée / sortie :
 *   E0 (initial) ─[dem_entree ET places < CAPACITE]→ E1 : barrière d'entrée ouverte, places += 1
 *                ─[dem_sortie ET places > 0]────────→ E3 : barrière de sortie ouverte, places -= 1
 *   E1 ─[passage]→ E2 ─[NON passage]→ E0
 *   E3 ─[passage]→ E4 ─[NON passage]→ E0
 *
 * GRAFCET "Signalisation" — voyant complet piloté par le seul niveau du compteur :
 *   E10 ─[places >= CAPACITE]→ E11 (complet) ─[places < CAPACITE]→ E10
 */
export function createParkingSolution(locale: Locale = "fr"): Project {
	const t = createTemplateText("parking", locale);
	const project = createParkingProject(locale);
	project.name = t("solutionName");

	// — GRAFCET "Commande" ————————————————————————————————————————————————
	// Sélection de séquence entrée / sortie : divergence en OU sous l'étape 0. La branche
	// « entrée » est la branche de gauche — le pré-compilateur lui donne la priorité si les
	// deux réceptivités sont vraies simultanément. Chaque branche reboucle sur l'étape 0 par
	// un renvoi d'étape (=0) plutôt qu'une connexion de retour, pour tenir dans la page A4.
	const XL = 20;
	const XR = 400;
	const XC = (XL + XR) / 2;

	const e0 = new StepBuilder()
		.id(createRandomId())
		.number(0)
		.initial()
		.position(XC - 20, 40)
		.build();
	// Barre de divergence dimensionnée pour que chaque branche tombe droit sur sa transition
	// aval (offsets alignés sur les centres de t01/t03) et que le pivot soit sous l'étape 0.
	const orStart = new JunctionOrStartBuilder()
		.id(createRandomId())
		.dimensions(XR - XL + 40, 30)
		.branchesPositions(20, XR - XL + 20)
		.pivotPosition(XC - XL)
		.position(XL, 95)
		.build();
	const [orStartEntree, orStartSortie] = orStart.data.branchesOrder;
	const t01 = new TransitionBuilder()
		.id(createRandomId())
		.expression(`dem_entree ET places < ${CAPACITE}`)
		.position(XL, 150)
		.build();
	const t03 = new TransitionBuilder()
		.id(createRandomId())
		.expression("dem_sortie ET places > 0")
		.position(XR, 150)
		.build();
	const e1 = new StepBuilder()
		.id(createRandomId())
		.number(1)
		.position(XL, 220)
		.build();
	const e3 = new StepBuilder()
		.id(createRandomId())
		.number(3)
		.position(XR, 220)
		.build();
	const t12 = new TransitionBuilder()
		.id(createRandomId())
		.expression("passage")
		.position(XL, 310)
		.build();
	const t34 = new TransitionBuilder()
		.id(createRandomId())
		.expression("passage")
		.position(XR, 310)
		.build();
	const e2 = new StepBuilder()
		.id(createRandomId())
		.number(2)
		.position(XL, 380)
		.build();
	const e4 = new StepBuilder()
		.id(createRandomId())
		.number(4)
		.position(XR, 380)
		.build();
	const t20 = new TransitionBuilder()
		.id(createRandomId())
		.expression("NON passage")
		.position(XL, 450)
		.build();
	const t40 = new TransitionBuilder()
		.id(createRandomId())
		.expression("NON passage")
		.position(XR, 450)
		.build();

	const aBarriere1 = new ActionBuilder()
		.id(createRandomId())
		.expression("barriere_entree")
		.type(ActionType.BOOLEAN_VARIABLE)
		.executionMode(ActionExecutionMode.CONTINUOUS)
		.width(135)
		.position(XL + 55, 220)
		.build();
	const aInc = new ActionBuilder()
		.id(createRandomId())
		.expression("places := places + 1")
		.type(ActionType.NUMERIC_VARIABLE)
		.executionMode(ActionExecutionMode.RISING_EDGE)
		.width(175)
		.position(XL + 55 + 135, 220)
		.build();
	const aBarriere3 = new ActionBuilder()
		.id(createRandomId())
		.expression("barriere_sortie")
		.type(ActionType.BOOLEAN_VARIABLE)
		.executionMode(ActionExecutionMode.CONTINUOUS)
		.width(135)
		.position(XR + 55, 220)
		.build();
	const aDec = new ActionBuilder()
		.id(createRandomId())
		.expression("places := places - 1")
		.type(ActionType.NUMERIC_VARIABLE)
		.executionMode(ActionExecutionMode.RISING_EDGE)
		.width(175)
		.position(XR + 55 + 135, 220)
		.build();

	const renvoiEntree = new StepReferralSourceBuilder()
		.id(createRandomId())
		.targetStepNumber(0)
		.position(XL, 500)
		.build();
	const renvoiSortie = new StepReferralSourceBuilder()
		.id(createRandomId())
		.targetStepNumber(0)
		.position(XR, 500)
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
		.name(t("controlGrafcet"))
		.addSteps(e0, e1, e2, e3, e4)
		.addTransitions(t01, t03, t12, t34, t20, t40)
		.addJunctionOrStart(orStart)
		.addActions(aBarriere1, aInc, aBarriere3, aDec)
		.addStepReferralsSources(renvoiEntree, renvoiSortie)
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
				orStartEntree,
				t01,
				TRANSITION_HANDLE_TARGET_PREDECESSOR,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				orStart,
				orStartSortie,
				t03,
				TRANSITION_HANDLE_TARGET_PREDECESSOR,
			),
			linkSeq(t01, e1),
			linkSeq(t03, e3),
			linkSeq(e1, t12),
			linkSeq(e3, t34),
			linkSeq(t12, e2),
			linkSeq(t34, e4),
			linkSeq(e2, t20),
			linkSeq(e4, t40),
			new ConnectionBuilder()
				.id(createRandomId())
				.source("transition", t20.id, TRANSITION_HANDLE_SOURCE_SUCCESSOR)
				.target(
					"step-referral-source",
					renvoiEntree.id,
					STEP_REFERRAL_SOURCE_HANDLE_TARGET_PREDECESSOR,
				)
				.build(),
			new ConnectionBuilder()
				.id(createRandomId())
				.source("transition", t40.id, TRANSITION_HANDLE_SOURCE_SUCCESSOR)
				.target(
					"step-referral-source",
					renvoiSortie.id,
					STEP_REFERRAL_SOURCE_HANDLE_TARGET_PREDECESSOR,
				)
				.build(),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				e1,
				STEP_HANDLE_SOURCE_ACTION,
				aBarriere1,
				ACTION_HANDLE_TARGET_STEP,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				e1,
				STEP_HANDLE_SOURCE_ACTION,
				aInc,
				ACTION_HANDLE_TARGET_STEP,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				e3,
				STEP_HANDLE_SOURCE_ACTION,
				aBarriere3,
				ACTION_HANDLE_TARGET_STEP,
			),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				e3,
				STEP_HANDLE_SOURCE_ACTION,
				aDec,
				ACTION_HANDLE_TARGET_STEP,
			),
		)
		.build();
	project.addProgram(commande);

	// — GRAFCET "Signalisation" ———————————————————————————————————————————
	const XS = 200;
	const ef0 = new StepBuilder()
		.id(createRandomId())
		.number(10)
		.initial()
		.position(XS, 40)
		.build();
	const tf01 = new TransitionBuilder()
		.id(createRandomId())
		.expression(`places >= ${CAPACITE}`)
		.position(XS, 110)
		.build();
	const ef1 = new StepBuilder()
		.id(createRandomId())
		.number(11)
		.position(XS, 180)
		.build();
	const tf10 = new TransitionBuilder()
		.id(createRandomId())
		.expression(`places < ${CAPACITE}`)
		.position(XS, 250)
		.build();
	const aComplet = new ActionBuilder()
		.id(createRandomId())
		.expression("complet")
		.type(ActionType.BOOLEAN_VARIABLE)
		.executionMode(ActionExecutionMode.CONTINUOUS)
		.position(XS + 90, 180)
		.build();

	const signalisation = new GrafcetBuilder()
		.id(createRandomId())
		.name(t("signalingGrafcet"))
		.addSteps(ef0, ef1)
		.addTransitions(tf01, tf10)
		.addActions(aComplet)
		.addConnections(
			linkSeq(ef0, tf01),
			linkSeq(tf01, ef1),
			linkSeq(ef1, tf10),
			new ConnectionBuilder()
				.id(createRandomId())
				.source("transition", tf10.id, TRANSITION_HANDLE_SOURCE_SUCCESSOR)
				.target("step", ef0.id, STEP_HANDLE_TARGET_PREDECESSOR)
				.data([
					[XS - 70, 280],
					[XS - 70, 15],
					[XS + 20, 15],
				])
				.build(),
			ConnectionBuilder.betweenElements(
				createRandomId(),
				ef1,
				STEP_HANDLE_SOURCE_ACTION,
				aComplet,
				ACTION_HANDLE_TARGET_STEP,
			),
		)
		.build();
	project.addProgram(signalisation);

	return project;
}
