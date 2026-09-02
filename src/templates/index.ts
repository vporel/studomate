import type frTemplates from "@/i18n/messages/fr/templates.json";
import Project from "@/schemas/project/project.schema";
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
	 * Énoncé de l'exercice (contexte + travail demandé), en Markdown. Injecté comme `exercise`
	 * dans le projet créé, aussi bien pour la version exercice que pour la solution — une même
	 * maquette pouvant servir de support à des énoncés différents. Absent = pas d'énoncé.
	 */
	statement?: string;
	/** Construit et retourne un projet neuf basé sur ce template (version exercice). */
	create: () => Project;
	/** Construit et retourne la version complète et simulable du template. Absent = pas de solution disponible. */
	solution?: () => Project;
};

/**
 * Template mis en avant sur l'écran de démarrage. Doit avoir une `solution`.
 * Changer cette valeur suffit pour modifier le template affiché.
 */
export const FEATURED_TEMPLATE_ID = "traffic-light";

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
		statement: [
			"## Feu tricolore",
			"",
			"On souhaite piloter un feu de circulation à trois couleurs. Les sorties disponibles sont",
			"`rouge`, `orange` et `vert` ; une seule doit être active à la fois.",
			"",
			"### Travail demandé",
			"",
			"1. Écrire le GRAFCET qui fait défiler les phases dans l'ordre **vert → orange → rouge**, en boucle.",
			"2. Temporiser chaque phase : vert 10 s, orange 2 s, rouge 10 s.",
			"3. Vérifier le fonctionnement en simulation à l'aide des voyants de l'interface HMI.",
		].join("\n"),
		create: createTrafficLightProject,
		solution: createTrafficLightSolution,
	},
	{
		id: "crossroads",
		statement: [
			"## Carrefour de feux tricolores",
			"",
			"Un carrefour croise deux axes : Nord-Sud (feux `NS1`, `NS2`) et Est-Ouest (feux `EO1`, `EO2`).",
			"Chaque feu dispose de ses trois sorties `rouge…`, `orange…`, `vert…` (par exemple `vertNS1`).",
			"",
			"### Travail demandé",
			"",
			"1. Faire fonctionner les deux feux d'un même axe **en parallèle** (même couleur au même instant).",
			"2. Alterner les deux axes en respectant une phase de **tout-au-rouge** entre chaque changement.",
			"3. Temporiser les phases et valider le cycle complet en simulation.",
		].join("\n"),
		create: createCrossroadsProject,
		solution: createCrossroadsSolution,
	},
	{
		id: "drilling",
		statement: [
			"## Poste de perçage",
			"",
			"Une perceuse automatique usine une pièce en un cycle. Entrée : `dcy` (bouton départ cycle).",
			"Sorties : `descendre`, `monter` (mouvement de la table) et `broche` (rotation du foret).",
			"Les capteurs de fin de course `h` (foret en haut) et `b` (foret en bas) sont fournis par la maquette.",
			"",
			"### Travail demandé",
			"",
			"1. Au repos, la table est en position haute, broche à l'arrêt.",
			"2. Sur appui de `dcy` : mettre la broche en rotation puis descendre jusqu'à `b`.",
			"3. Maintenir le perçage 3 s en position basse, puis remonter jusqu'à `h` et arrêter la broche.",
			"4. Le cycle ne redémarre que sur un nouvel appui de `dcy`.",
		].join("\n"),
		create: createDrillingProject,
		solution: createDrillingSolution,
	},
	{
		id: "elevator",
		statement: [
			"## Ascenseur 3 niveaux",
			"",
			"Un ascenseur dessert trois étages (0, 1, 2). Appels : `appel_0..2` (paliers) et `cabine_0..2` (pupitre).",
			"Sorties : `monter`, `descendre` (déplacement) et `porte` (ouverture). Capteurs de position d'étage",
			"`etage_0..2` et `porte_ouverte` fournis par la maquette.",
			"",
			"### Travail demandé",
			"",
			"1. Sur un appel, déplacer la cabine vers l'étage demandé dans le bon sens.",
			"2. À l'arrivée, arrêter la cabine et ouvrir la porte pendant 3 s, puis la refermer.",
			"3. Ignorer un nouvel appel tant qu'un déplacement est en cours (traitement d'un appel à la fois).",
			"4. Valider en simulation avec l'afficheur d'étage et l'animation de la cabine.",
		].join("\n"),
		create: createElevatorProject,
		solution: createElevatorSolution,
	},
	{
		id: "parking",
		statement: [
			"## Parking à barrière",
			"",
			"Un parking possède un nombre fini de places. Entrées : `dem_entree`, `dem_sortie` (demandes de passage).",
			"Sorties : `barriere` (ouverture) et `complet` (voyant). Le nombre de places occupées est suivi dans `places`.",
			"",
			"### Travail demandé",
			"",
			"1. Sur `dem_entree`, si le parking n'est pas complet : ouvrir la barrière, incrémenter `places`.",
			"2. Sur `dem_sortie`, si le parking n'est pas vide : ouvrir la barrière, décrémenter `places`.",
			"3. Allumer `complet` dès que toutes les places sont occupées et refuser les nouvelles entrées.",
			"4. Vérifier la jauge d'occupation en simulation.",
		].join("\n"),
		create: createParkingProject,
		solution: createParkingSolution,
	},
];
