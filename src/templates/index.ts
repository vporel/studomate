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
	createParkingProject,
	createParkingSolution,
} from "./parking.template";
import {
	createTrafficLightProject,
	createTrafficLightSolution,
} from "./traffic-light.template";

export type ProjectTemplate = {
	/** Identifiant stable, utilisé comme clé dans la modale. */
	id: string;
	/** Libellé affiché dans la modale de sélection. */
	label: string;
	/** Description courte affichée sous le titre dans la modale. */
	description: string;
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
		label: "Feu tricolore",
		description:
			"3 sorties booléennes (rouge, orange, vert) + interface HMI avec voyants colorés. À programmer.",
		create: createTrafficLightProject,
		solution: createTrafficLightSolution,
	},
	{
		id: "crossroads",
		label: "Carrefour de feux tricolores",
		description:
			"12 sorties booléennes (rouge/orange/vert × 4 feux : NS1, NS2, EO1, EO2) + interface HMI avec carrefour. À programmer.",
		create: createCrossroadsProject,
		solution: createCrossroadsSolution,
	},
	{
		id: "drilling",
		label: "Poste de perçage",
		description:
			"Cycle séquentiel piloté par capteurs de fin de course : appui départ, descente, perçage temporisé, remontée. Modèle de partie opérative fourni. À programmer.",
		create: createDrillingProject,
		solution: createDrillingSolution,
	},
	{
		id: "parking",
		label: "Parking à barrière",
		description:
			"Barrière + compteur de places : entrées/sorties par boutons, voyant « complet », jauge et affichage d'occupation. À programmer.",
		create: createParkingProject,
		solution: createParkingSolution,
	},
];
