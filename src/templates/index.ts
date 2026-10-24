import type frTemplates from "@/i18n/messages/fr/templates.json";
import type { Locale } from "@/i18n/config";
import Project from "@/schemas/project/project.schema";
import {
	createCartonSortingProject,
	createCartonSortingSolution,
} from "./carton-sorting.template";
import {
	createCrossroadsProject,
	createCrossroadsSolution,
} from "./crossroads.template";
import {
	createDrillingProject,
	createDrillingSolution,
} from "./drilling.template";
import {
	createElevatorProject,
	createElevatorSolution,
} from "./elevator.template";
import {
	createParkingProject,
	createParkingSolution,
} from "./parking.template";
import {
	createTrafficLightProject,
	createTrafficLightSolution,
} from "./traffic-light.template";
import {
	createLinearSequenceProject,
	createLinearSequenceSolution,
} from "./training/grafcet/linear-sequence.template";
import {
	createAndDivergenceProject,
	createAndDivergenceSolution,
} from "./training/grafcet/and-divergence.template";
import {
	createOrDivergenceProject,
	createOrDivergenceSolution,
} from "./training/grafcet/or-divergence.template";
import {
	createTimerCycleProject,
	createTimerCycleSolution,
} from "./training/grafcet/timer-cycle.template";
import { createLadderAndOrProject } from "./training/ladder/ladder-and-or.template";
import { createLadderReadingProject } from "./training/ladder/ladder-reading.template";
import {
	createLadderLogicProject,
	createLadderLogicSolution,
} from "./training/ladder/ladder-logic.template";
import {
	createLadderSelfHoldingProject,
	createLadderSelfHoldingSolution,
} from "./training/ladder/ladder-self-holding.template";
import {
	createLadderInterlockProject,
	createLadderInterlockSolution,
} from "./training/ladder/ladder-interlock.template";
import {
	createLadderMemoryProject,
	createLadderMemorySolution,
} from "./training/ladder/ladder-memory.template";
import { createLadderEdgesReadingProject } from "./training/ladder/ladder-edges-reading.template";
import {
	createLadderToggleProject,
	createLadderToggleSolution,
} from "./training/ladder/ladder-toggle.template";
import {
	createLadderGateProject,
	createLadderGateSolution,
} from "./training/ladder/ladder-gate.template";
import { createLadderTimersReadingProject } from "./training/ladder/ladder-timers-reading.template";
import {
	createLadderTimersProject,
	createLadderTimersSolution,
} from "./training/ladder/ladder-timers.template";
import {
	createLadderCountersProject,
	createLadderCountersSolution,
} from "./training/ladder/ladder-counters.template";
import {
	createLadderTankProject,
	createLadderTankSolution,
} from "./training/ladder/ladder-tank.template";
import {
	createLadderScalingProject,
	createLadderScalingSolution,
} from "./training/ladder/ladder-scaling.template";
import {
	createLadderSubprogramsProject,
	createLadderSubprogramsSolution,
} from "./training/ladder/ladder-subprograms.template";
import {
	createLadderPackingProject,
	createLadderPackingSolution,
} from "./training/ladder/ladder-packing.template";
import {
	createLinearSequenceNaiveLadderProject,
	createLinearSequenceLadderProject,
	createLinearSequenceLadderSolution,
} from "./training/ladder/linear-sequence-ladder.template";
import {
	createDrillingLadderProject,
	createDrillingLadderSolution,
} from "./training/ladder/drilling-ladder.template";
import {
	createOrDivergenceLadderProject,
	createOrDivergenceLadderSolution,
} from "./training/ladder/or-divergence-ladder.template";
import {
	createAndDivergenceLadderProject,
	createAndDivergenceLadderSolution,
} from "./training/ladder/and-divergence-ladder.template";
import {
	createTrafficLightLadderProject,
	createTrafficLightLadderSolution,
} from "./training/ladder/traffic-light-ladder.template";
import {
	createParkingLadderProject,
	createParkingLadderSolution,
} from "./training/ladder/parking-ladder.template";
import {
	createGateGrafcetLadderProject,
	createGateGrafcetLadderSolution,
} from "./training/ladder/gate-grafcet-ladder.template";

/**
 * Identifiant d'un template — aussi sa clé de traduction : le libellé et la description
 * affichés vivent dans `src/i18n/messages/{fr,en}/templates.json` sous
 * `templates.<id>.label` / `.description` (jamais persistés dans le projet créé).
 */
export type TemplateId = keyof typeof frTemplates;

export type ProjectTemplate = {
	/** Identifiant stable, aussi la clé de traduction (voir `TemplateId`). */
	id: TemplateId;
	/**
	 * Construit et retourne un projet neuf basé sur ce template (version exercice), dans la
	 * langue demandée. Son énoncé éventuel est lu par `statementFor`.
	 */
	create: (locale: Locale) => Project;
	/** Construit et retourne la version complète et simulable du template. Absent = pas de solution disponible. */
	solution?: (locale: Locale) => Project;
	/**
	 * Mnémoniques que `localizeProject` ne renomme jamais : noms imposés par la scène 3D ou par
	 * un projet réel dont ils sont issus.
	 */
	keepMnemonics?: readonly string[];
	/**
	 * Hides this template from the "New project" popup (`NewProjectModal`): still resolvable by
	 * `id` (`?template=` link, store-side creation) but absent from the visible catalog. Used by
	 * the Training module's mini-templates.
	 */
	hiddenFromCatalog?: boolean;
};

/**
 * Template mis en avant sur l'écran de démarrage. Doit avoir une `solution` et figurer dans
 * `STARTUP_EXAMPLE_IDS` (`src/ui/components/startup/startup-examples.ts`).
 */
export const FEATURED_TEMPLATE_ID = "crossroads";

/**
 * Pour ajouter un template : créer un fichier `xxx.template.ts`, y exporter une fonction
 * `createXxxProject(): Project`, puis ajouter une entrée ici.
 *
 * Note de maintenance : si `PROJECT_SCHEMA_VERSION` est incrémenté suite à un changement
 * de schéma, vérifier que les données produites par chaque template sont conformes au
 * nouveau schéma. Les templates ne passent pas par le pipeline de migration.
 */
export const PROJECT_TEMPLATES: ProjectTemplate[] = [
	{
		id: "traffic-light",
		create: createTrafficLightProject,
		solution: createTrafficLightSolution,
	},
	{
		id: "crossroads",
		create: createCrossroadsProject,
		solution: createCrossroadsSolution,
	},
	{
		id: "drilling",
		create: createDrillingProject,
		solution: createDrillingSolution,
	},
	{
		id: "elevator",
		create: createElevatorProject,
		solution: createElevatorSolution,
	},
	{
		id: "parking",
		create: createParkingProject,
		solution: createParkingSolution,
	},
	{
		id: "carton-sorting",
		keepMnemonics: ["dcy"],
		create: createCartonSortingProject,
		solution: createCartonSortingSolution,
	},
	{
		id: "linear-sequence",
		hiddenFromCatalog: true,
		create: createLinearSequenceProject,
		solution: createLinearSequenceSolution,
	},
	{
		id: "and-divergence",
		hiddenFromCatalog: true,
		create: createAndDivergenceProject,
		solution: createAndDivergenceSolution,
	},
	{
		id: "or-divergence",
		hiddenFromCatalog: true,
		create: createOrDivergenceProject,
		solution: createOrDivergenceSolution,
	},
	{
		id: "timer-cycle",
		hiddenFromCatalog: true,
		create: createTimerCycleProject,
		solution: createTimerCycleSolution,
	},

	{
		id: "ladder-and-or",
		hiddenFromCatalog: true,
		create: createLadderAndOrProject,
		solution: createLadderAndOrProject,
	},
	{
		id: "ladder-reading",
		hiddenFromCatalog: true,
		create: createLadderReadingProject,
	},
	{
		id: "ladder-logic",
		hiddenFromCatalog: true,
		create: createLadderLogicProject,
		solution: createLadderLogicSolution,
	},
	{
		id: "ladder-self-holding",
		hiddenFromCatalog: true,
		create: createLadderSelfHoldingProject,
		solution: createLadderSelfHoldingSolution,
	},
	{
		id: "ladder-interlock",
		hiddenFromCatalog: true,
		create: createLadderInterlockProject,
		solution: createLadderInterlockSolution,
	},
	{
		id: "ladder-memory",
		hiddenFromCatalog: true,
		create: createLadderMemoryProject,
		solution: createLadderMemorySolution,
	},
	{
		id: "ladder-edges-reading",
		hiddenFromCatalog: true,
		create: createLadderEdgesReadingProject,
		solution: createLadderEdgesReadingProject,
	},
	{
		id: "ladder-toggle",
		hiddenFromCatalog: true,
		create: createLadderToggleProject,
		solution: createLadderToggleSolution,
	},
	{
		id: "ladder-gate",
		hiddenFromCatalog: true,
		create: createLadderGateProject,
		solution: createLadderGateSolution,
	},
	{
		id: "ladder-timers-reading",
		hiddenFromCatalog: true,
		create: createLadderTimersReadingProject,
		solution: createLadderTimersReadingProject,
	},
	{
		id: "ladder-timers",
		hiddenFromCatalog: true,
		create: createLadderTimersProject,
		solution: createLadderTimersSolution,
	},
	{
		id: "ladder-counters",
		hiddenFromCatalog: true,
		create: createLadderCountersProject,
		solution: createLadderCountersSolution,
	},
	{
		id: "ladder-tank",
		hiddenFromCatalog: true,
		create: createLadderTankProject,
		solution: createLadderTankSolution,
	},
	{
		id: "ladder-scaling",
		hiddenFromCatalog: true,
		create: createLadderScalingProject,
		solution: createLadderScalingSolution,
	},
	{
		id: "ladder-subprograms",
		hiddenFromCatalog: true,
		create: createLadderSubprogramsProject,
		solution: createLadderSubprogramsSolution,
	},
	{
		id: "ladder-packing",
		hiddenFromCatalog: true,
		create: createLadderPackingProject,
		solution: createLadderPackingSolution,
	},
	{
		id: "linear-sequence-naive-ladder",
		hiddenFromCatalog: true,
		create: createLinearSequenceNaiveLadderProject,
		solution: createLinearSequenceNaiveLadderProject,
	},
	{
		id: "linear-sequence-ladder",
		hiddenFromCatalog: true,
		create: createLinearSequenceLadderProject,
		solution: createLinearSequenceLadderSolution,
	},
	{
		id: "drilling-ladder",
		hiddenFromCatalog: true,
		create: createDrillingLadderProject,
		solution: createDrillingLadderSolution,
	},
	{
		id: "or-divergence-ladder",
		hiddenFromCatalog: true,
		create: createOrDivergenceLadderProject,
		solution: createOrDivergenceLadderSolution,
	},
	{
		id: "and-divergence-ladder",
		hiddenFromCatalog: true,
		create: createAndDivergenceLadderProject,
		solution: createAndDivergenceLadderSolution,
	},
	{
		id: "traffic-light-ladder",
		hiddenFromCatalog: true,
		create: createTrafficLightLadderProject,
		solution: createTrafficLightLadderSolution,
	},
	{
		id: "parking-ladder",
		hiddenFromCatalog: true,
		create: createParkingLadderProject,
		solution: createParkingLadderSolution,
	},
	{
		id: "gate-grafcet-ladder",
		hiddenFromCatalog: true,
		create: createGateGrafcetLadderProject,
		solution: createGateGrafcetLadderSolution,
	},
];
