import type frTemplates from "@/i18n/messages/fr/templates.json";
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
	createLadderReadingProject,
} from "./training/ladder/ladder-reading.template";
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
import {
	createLadderEdgesReadingProject,
} from "./training/ladder/ladder-edges-reading.template";
import {
	createLadderToggleProject,
	createLadderToggleSolution,
} from "./training/ladder/ladder-toggle.template";
import {
	createLadderGateProject,
	createLadderGateSolution,
} from "./training/ladder/ladder-gate.template";
import {
	createLadderTimersReadingProject,
} from "./training/ladder/ladder-timers-reading.template";
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
	 * Énoncé de l'exercice (contexte + travail demandé), en Markdown. Injecté comme `exercise`
	 * dans le projet créé, aussi bien pour la version exercice que pour la solution — une même
	 * maquette pouvant servir de support à des énoncés différents. Absent = pas d'énoncé.
	 */
	statement?: string;
	/** Construit et retourne un projet neuf basé sur ce template (version exercice). */
	create: () => Project;
	/** Construit et retourne la version complète et simulable du template. Absent = pas de solution disponible. */
	solution?: () => Project;
	/**
	 * Hides this template from the "New project" popup (`NewProjectModal`): still resolvable by
	 * `id` (`?template=` link, store-side creation) but absent from the visible catalog. Used by
	 * the Training module's mini-templates.
	 */
	hiddenFromCatalog?: boolean;
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
	{
		id: "carton-sorting",
		statement: [
			"## Poste de tri de caisses",
			"",
			"Des caisses arrivent une à une sur le tapis `Cmd_T1` jusqu'à un poste de détection.",
			"Le capteur `cpt_psce_c` signale la présence d'une caisse, `cpt_c_hte` indique qu'elle est haute.",
			"Trois vérins double effet `P1`, `P2`, `P3` (commandes `Cmd_Px_out` / `Cmd_Px_in`,",
			"fins de course `cpt_px_out` / `cpt_px_in`) aiguillent la caisse. Le compteur `C` totalise",
			"les caisses triées.",
			"",
			"### Travail demandé",
			"",
			"1. Sur `dcy`, démarrer les tapis (`Cmd_T2T3` mémorisé, `Cmd_T1` tant qu'une caisse circule).",
			"2. Caisse **basse** : la pousser avec `P1` puis l'évacuer vers `T2` avec `P2`.",
			"3. Caisse **haute** : la pousser avec `P1` puis l'évacuer vers `T3` avec `P3`.",
			"4. Incrémenter `C` à chaque caisse triée ; après 2 caisses, réinitialiser le cycle complet.",
			"5. Vérifier le tri en simulation à l'aide de la vue HMI (bouton « Nouvelle caisse », sélecteur de hauteur).",
		].join("\n"),
		create: createCartonSortingProject,
		solution: createCartonSortingSolution,
	},
	{
		id: "linear-sequence",
		hiddenFromCatalog: true,
		statement: [
			"## Séquence linéaire",
			"",
			"Entrées : `dcy`, `fin1`, `fin2`. Sorties : `sortie1`, `sortie2`.",
			"",
			"### Travail demandé",
			"",
			"1. Sur `dcy`, activer `sortie1`.",
			"2. Sur `fin1`, désactiver `sortie1` et activer `sortie2`.",
			"3. Sur `fin2`, désactiver `sortie2`.",
			"4. Sur un nouvel appui de `dcy`, reprendre le cycle depuis le début.",
		].join("\n"),
		create: createLinearSequenceProject,
		solution: createLinearSequenceSolution,
	},
	{
		id: "and-divergence",
		hiddenFromCatalog: true,
		statement: [
			"## Divergence en ET",
			"",
			"Entrées : `dcy`, `capteur1`, `capteur2`. Sorties : `sortie1`, `sortie2`.",
			"",
			"### Travail demandé",
			"",
			"1. Sur `dcy`, activer **simultanément** `sortie1` et `sortie2`.",
			"2. Attendre que `capteur1` **et** `capteur2` soient actifs avant de revenir à l'état initial",
			"   (désactivation des deux sorties).",
		].join("\n"),
		create: createAndDivergenceProject,
		solution: createAndDivergenceSolution,
	},
	{
		id: "or-divergence",
		hiddenFromCatalog: true,
		statement: [
			"## Divergence en OU",
			"",
			"Entrées : `dcy1`, `dcy2`, `fin1`, `fin2`. Sorties : `sortie1`, `sortie2`.",
			"",
			"### Travail demandé",
			"",
			"1. Sur `dcy1`, activer `sortie1` ; sur `fin1`, revenir à l'état initial.",
			"2. Sur `dcy2` (exclusif de `dcy1`), activer `sortie2` ; sur `fin2`, revenir à l'état initial.",
			"3. Vérifiez dans le panneau d'analyse que Studomate ne signale rien tant que `dcy1` et",
			"   `dcy2` restent exclusifs.",
		].join("\n"),
		create: createOrDivergenceProject,
		solution: createOrDivergenceSolution,
	},
	{
		id: "ladder-reading",
		hiddenFromCatalog: true,
		statement: [
			"## Lire un programme Ladder",
			"",
			"Entrées : `a`, `b`, `c` (interrupteurs). Sorties : `s1`, `s2`, `s3`, `s4`.",
			"",
			"### Travail demandé",
			"",
			"1. Ouvrir le programme Main.",
			"2. Sans lancer la simulation, prédire l'état de `s1` à `s4` pour chaque combinaison d'entrées :",
			"",
			"   | a | b | c | s1 | s2 | s3 | s4 |",
			"   |---|---|---|----|----|----|----|",
			"   | 0 | 0 | 0 |    |    |    |    |",
			"   | 1 | 0 | 0 |    |    |    |    |",
			"   | 1 | 1 | 0 |    |    |    |    |",
			"   | 1 | 1 | 1 |    |    |    |    |",
			"",
			"3. Vérifier vos prédictions en simulation, avec la table de visualisation.",
			"4. Expliquer pourquoi `s3` s'éteint quand `b` est actionné.",
		].join("\n"),
		create: createLadderReadingProject,
	},
	{
		id: "ladder-logic",
		hiddenFromCatalog: true,
		statement: [
			"## Éclairage en va-et-vient",
			"",
			"Entrées : `inter1`, `inter2`, `validation`. Sortie : `lampe`.",
			"",
			"### Travail demandé",
			"",
			"Dans le programme Main, on veut réaliser le comportement suivant :",
			"",
			"- La lampe s'allume quand exactement un des deux interrupteurs est actionné (table de vérité du va-et-vient).",
			"- La lampe ne s'allume que si `validation` est active.",
			"",
			"Écrire l'équation `(inter1 ET NON inter2) OU (NON inter1 ET inter2)` avec deux branches en parallèle, puis vérifier les quatre combinaisons en simulation.",
		].join("\n"),
		create: createLadderLogicProject,
		solution: createLadderLogicSolution,
	},
	{
		id: "ladder-self-holding",
		hiddenFromCatalog: true,
		statement: [
			"## Pompe : auto-maintien",
			"",
			"Entrées : `marche` (bouton poussoir), `arret` (bouton d'arrêt). Sortie : `pompe`.",
			"",
			"### Travail demandé",
			"",
			"1. Un appui sur `marche` démarre la pompe, qui reste en marche après le relâchement du bouton.",
			"2. Un appui sur `arret` l'arrête, même si `marche` est appuyé en même temps (arrêt prioritaire).",
		].join("\n"),
		create: createLadderSelfHoldingProject,
		solution: createLadderSelfHoldingSolution,
	},
	{
		id: "ladder-interlock",
		hiddenFromCatalog: true,
		statement: [
			"## Moteur deux sens",
			"",
			"Entrées : `avant`, `arriere` (boutons poussoirs), `arret` (câblé à ouverture). Sorties : `moteur_av`, `moteur_ar`.",
			"",
			"### Travail demandé",
			"",
			"1. Chaque sens se commande par un auto-maintien à arrêt prioritaire, l'arrêt étant commun.",
			"2. Verrouiller les deux sens : le contact à ouverture de chaque sortie est placé dans le réseau de l'autre.",
			"3. Sur de vrais contacteurs inverseurs, ce verrouillage est aussi câblé : celui du programme ne suffit pas seul.",
		].join("\n"),
		create: createLadderInterlockProject,
		solution: createLadderInterlockSolution,
	},
	{
		id: "ladder-memory",
		hiddenFromCatalog: true,
		statement: [
			"## Pompe : défaut mémorisé",
			"",
			"Le Main contient le corrigé de la pompe. Nouvelles entrées : `temperature_ok` (capteur câblé à ouverture, un commutateur maintenu), `acquit`. Nouvelle sortie : `voyant_defaut`.",
			"",
			"### Travail demandé",
			"",
			"1. Une surchauffe (`temperature_ok` passe à faux) arrête la pompe et allume `voyant_defaut`, qui reste allumé (défaut mémorisé).",
			"2. L'acquittement éteint le voyant une fois le défaut disparu.",
			"3. Après acquittement, la pompe ne redémarre pas seule : il faut un nouvel appui sur `marche`.",
		].join("\n"),
		create: createLadderMemoryProject,
		solution: createLadderMemorySolution,
	},
	{
		id: "ladder-edges-reading",
		hiddenFromCatalog: true,
		statement: [
			"## Lire les fronts",
			"",
			"Une même entrée `bp` pilote trois sorties : `s_no` (contact NO), `s_p` (contact P), `s_n` (contact N), chacune par une bobine S. `raz` remet les trois à zéro.",
			"",
			"### Travail demandé",
			"",
			"1. En simulation pas à pas, appuyer sur `bp`, le maintenir plusieurs cycles, puis le relâcher.",
			"2. Relever cycle par cycle l'état des trois contacts : c'est un chronogramme.",
			"3. Expliquer pourquoi le contact P et le contact N ne sont passants qu'un seul cycle, alors que `s_p` et `s_n` restent à vrai une fois mémorisés.",
		].join("\n"),
		create: createLadderEdgesReadingProject,
	},
	{
		id: "ladder-toggle",
		hiddenFromCatalog: true,
		statement: [
			"## Télérupteur",
			"",
			"Entrée : `bp`. Sortie : `lampe`. Mémoire : `imp`. L'exercice part d'une solution naïve à deux réseaux, sur laquelle la lampe ne s'allume jamais.",
			"",
			"### Travail demandé",
			"",
			"1. Simuler la solution naïve : pourquoi la lampe ne s'allume-t-elle jamais ?",
			"2. Dérouler un cycle réseau par réseau sur papier, puis corriger avec un seul contact P qui écrit la mémoire `imp`.",
			"3. La lampe doit basculer une seule fois par appui, même bouton maintenu plusieurs cycles.",
		].join("\n"),
		create: createLadderToggleProject,
		solution: createLadderToggleSolution,
	},
	{
		id: "ladder-gate",
		hiddenFromCatalog: true,
		statement: [
			"## Portail motorisé",
			"",
			"Seules les sorties `ouvrir` et `fermer` sont déclarées. Cahier des charges : boutons Ouvrir et Fermer, fins de course ouvert et fermé, bouton d'arrêt câblé à ouverture, cellule photoélectrique (barrière immatérielle) de détection d'obstacle.",
			"",
			"### Travail demandé",
			"",
			"1. Déclarer les entrées dans la table des variables (mnémonique, type, comportement physique).",
			"2. Deux sens verrouillés, arrêt sur fin de course, arrêt prioritaire.",
			"3. En fermeture, une coupure de la cellule photoélectrique provoque la réouverture.",
			"4. Ce type d'équipement relève de l'EN 12453.",
		].join("\n"),
		create: createLadderGateProject,
		solution: createLadderGateSolution,
	},
	{
		id: "ladder-timers-reading",
		hiddenFromCatalog: true,
		statement: [
			"## Lire les temporisations",
			"",
			"Une même entrée `bp` pilote un `TON`, un `TOF` et un `TP` de 2 s : `q_ton`, `q_tof`, `q_tp`.",
			"",
			"### Travail demandé",
			"",
			"1. Pour la séquence d'appuis suivante, tracer le chronogramme des trois sorties : appui long, puis appui plus court que 2 s, puis second appui pendant l'impulsion du `TP`.",
			"2. Vérifier en simulation.",
		].join("\n"),
		create: createLadderTimersReadingProject,
	},
	{
		id: "ladder-timers",
		hiddenFromCatalog: true,
		statement: [
			"## Démarrage étoile-triangle",
			"",
			"Entrées : `marche`, `arret` (câblé à ouverture), `inter_clignotant`. Sorties : `km_ligne`, `km_etoile`, `km_triangle`, `ventilateur`, `voyant`.",
			"",
			"### Travail demandé",
			"",
			"1. Marche : contacteur de ligne et étoile, puis triangle après 5 s (un `TON`). Étoile et triangle sont verrouillés (ce verrouillage est aussi câblé).",
			"2. Le ventilateur continue 10 s après l'arrêt (un `TOF`).",
			"3. Facultatif : temps mort entre l'étoile et le triangle ; clignotant réglable à deux `TON` croisés.",
		].join("\n"),
		create: createLadderTimersProject,
		solution: createLadderTimersSolution,
	},
	{
		id: "ladder-counters",
		hiddenFromCatalog: true,
		statement: [
			"## Comptage",
			"",
			"Toutes les variables sont fournies.",
			"",
			"### Travail demandé",
			"",
			"1. Convoyeur : compter les pièces (`CTU`), arrêter le convoyeur à la présélection, remise à zéro par `raz`.",
			"2. Zone tampon : `capteur_entree` compte, `capteur_sortie` décompte (`CTUD`), voyant « plein » sur `QU`, « vide » sur `QD`.",
			"3. Facultatif : stock de pièces (`CTD`), chargé par `charge_stock`, voyant « stock vide » sur `Q`.",
		].join("\n"),
		create: createLadderCountersProject,
		solution: createLadderCountersSolution,
	},
	{
		id: "ladder-tank",
		hiddenFromCatalog: true,
		statement: [
			"## Cuve",
			"",
			"Entrée : `niveau` (0 à 100 %). Sorties : `pompe`, `alarme`. Mémoire : `nb_demarrages`.",
			"",
			"### Travail demandé",
			"",
			"1. La pompe démarre sous 20 %, s'arrête au-dessus de 80 % (hystérésis : comparaison plus mémoire).",
			"2. Alarme au-dessus de 95 %.",
			"3. Le Main incrémente `nb_demarrages` sous contact NO : constater en simulation qu'il augmente à chaque cycle, puis corriger avec un contact P.",
		].join("\n"),
		create: createLadderTankProject,
		solution: createLadderTankSolution,
	},
	{
		id: "ladder-scaling",
		hiddenFromCatalog: true,
		statement: [
			"## Mise à l'échelle",
			"",
			"`niveau` n'est plus une entrée : il se calcule à partir de `brut` (0 à 27648). Le Main contient le corrigé de la cuve.",
			"",
			"### Travail demandé",
			"",
			"1. Calculer `niveau := brut * 100 / 27648` en INT : constater le rebouclage de `brut * 100`.",
			"2. Essayer de diviser d'abord : constater la troncature à 0.",
			"3. Corriger en calculant dans `calcul_real` (ou `calcul_dint`), puis convertir vers `niveau`.",
		].join("\n"),
		create: createLadderScalingProject,
		solution: createLadderScalingSolution,
	},
	{
		id: "ladder-packing",
		hiddenFromCatalog: true,
		statement: [
			"## Mise en caisse",
			"",
			"Aucune variable n'est fournie : établir puis déclarer la table complète des entrées, sorties et mémoires.",
			"",
			"### Cahier des charges",
			"",
			"1. Convoyeur en marche/arrêt, défaut thermique mémorisé (acquittement puis nouvel appui sur Marche).",
			"2. Voyant de défaut : clignotant tant que le défaut n'est pas acquitté, fixe s'il est acquitté mais présent, éteint une fois disparu.",
			"3. Comptage des pièces sur front ; à la présélection, arrêt du convoyeur et temporisation de changement de caisse, puis redémarrage automatique et remise à zéro du compteur.",
			"4. Structurer en sous-programmes appelés par le Main.",
		].join("\n"),
		create: createLadderPackingProject,
		solution: createLadderPackingSolution,
	},
	{
		id: "linear-sequence-naive-ladder",
		hiddenFromCatalog: true,
		statement: [
			"## Séquence linéaire : méthode des manuels",
			"",
			"GRAFCET : E0 (initiale) → `dcy` → E1 (`sortie1`) → `fin1` → E2 (`sortie2`) → `fin2` → E3 → VRAI → E0. Le Main l'implante avec un auto-maintien par étape.",
			"",
			"### Travail demandé",
			"",
			"1. En simulation pas à pas, constater qu'au franchissement deux étapes consécutives restent actives pendant un cycle.",
			"2. Expliquer ce qui se passe. Pas de programme à écrire.",
		].join("\n"),
		create: createLinearSequenceNaiveLadderProject,
	},
	{
		id: "linear-sequence-ladder",
		hiddenFromCatalog: true,
		statement: [
			"## Séquence linéaire en Ladder",
			"",
			"GRAFCET : E0 (initiale) → `dcy` → E1 (`sortie1`) → `fin1` → E2 (`sortie2`) → `fin2` → E3 → VRAI → E0. Mémoires d'étape : `M0` à `M3`.",
			"",
			"### Travail demandé",
			"",
			"Implanter le GRAFCET avec la méthode en trois blocs : conditions de franchissement, évolution des étapes (tous les reset, puis tous les set), sorties.",
		].join("\n"),
		create: createLinearSequenceLadderProject,
		solution: createLinearSequenceLadderSolution,
	},
	{
		id: "drilling-ladder",
		hiddenFromCatalog: true,
		statement: [
			"## Poste de perçage en Ladder",
			"",
			"La partie opérative est fournie (appelée par le Main). Interrupteur `blocage` : le foret n'avance plus en descente tant qu'il est vrai.",
			"",
			"### Travail demandé",
			"",
			"1. Implanter le GRAFCET du poste : `dcy` → descente jusqu'à `b` → perçage 2 s (un `TON`) → remontée jusqu'à `h`.",
			"2. Surveiller la descente : si le foret n'atteint pas le bas en 8 s, défaut mémorisé et remontée. Tester en actionnant `blocage`.",
		].join("\n"),
		create: createDrillingLadderProject,
		solution: createDrillingLadderSolution,
	},
	{
		id: "or-divergence-ladder",
		hiddenFromCatalog: true,
		statement: [
			"## Divergence en OU en Ladder",
			"",
			"GRAFCET : E0 → `dcy1` → E1 (`sortie1`) → `fin1` → E0 ; E0 → `dcy2` → E2 (`sortie2`) → `fin2` → E0. Mémoires : `M0` à `M2`.",
			"",
			"### Travail demandé",
			"",
			"Implanter le GRAFCET en trois blocs. Constater que si `dcy1` et `dcy2` sont vrais en même temps, les deux branches s'activent : c'est presque toujours une erreur de conception.",
		].join("\n"),
		create: createOrDivergenceLadderProject,
		solution: createOrDivergenceLadderSolution,
	},
	{
		id: "and-divergence-ladder",
		hiddenFromCatalog: true,
		statement: [
			"## Divergence en ET en Ladder",
			"",
			"GRAFCET : E0 → `dcy` → E1 (`sortie1`) et E2 (`sortie2`) → `capteur1 ET capteur2` → E0. Mémoires : `M0` à `M2`.",
			"",
			"### Travail demandé",
			"",
			"Implanter le GRAFCET en trois blocs : une transition active plusieurs étapes, la convergence exige toutes les étapes amont et les désactive toutes.",
		].join("\n"),
		create: createAndDivergenceLadderProject,
		solution: createAndDivergenceLadderSolution,
	},
	{
		id: "traffic-light-ladder",
		hiddenFromCatalog: true,
		statement: [
			"## Feu tricolore en Ladder",
			"",
			"GRAFCET : E0 vert 5 s → E1 orange 2 s → E2 rouge 5 s → E0. Entrées : `arret` (câblé à ouverture), `marche` (interrupteur).",
			"",
			"### Travail demandé",
			"",
			"1. Implanter le GRAFCET avec trois `TON`.",
			"2. Arrêt immédiat : `arret` réinitialise le GRAFCET (étapes à zéro, étape initiale réactivée).",
			"3. Arrêt en fin de cycle : `marche` est ajouté à la réceptivité qui reboucle, le feu termine son cycle et reste au rouge tant que `marche` est faux.",
		].join("\n"),
		create: createTrafficLightLadderProject,
		solution: createTrafficLightLadderSolution,
	},
	{
		id: "parking-ladder",
		hiddenFromCatalog: true,
		statement: [
			"## Parking en Ladder",
			"",
			"GRAFCET de commande : E0 → `dem_entree ET places < 4` → E1 (`barriere`, `places := places + 1`) → `passage` → E2 → NON `passage` → E0 ; E0 → `dem_sortie ET places > 0` → E3 (`barriere`, `places := places - 1`) → `passage` → E4 → NON `passage` → E0. La signalisation (`complet`) est déjà implantée. Mémoires : `M0` à `M4`.",
			"",
			"### Travail demandé",
			"",
			"1. Implanter la commande en trois blocs, avec incrément et décrément sur front d'étape.",
			"2. Ajouter une réinitialisation de la commande sur `arret`. Réfléchir : le compteur de places est-il remis à zéro ?",
		].join("\n"),
		create: createParkingLadderProject,
		solution: createParkingLadderSolution,
	},
	{
		id: "gate-grafcet-ladder",
		hiddenFromCatalog: true,
		statement: [
			"## Portail à télécommande",
			"",
			"Entrées : `telecommande` (un seul bouton), `arret` (câblé à ouverture), `fc_ouvert`, `fc_ferme`, `barriere_immaterielle` (cellule photoélectrique de détection d'obstacle). Sorties : `ouvrir`, `fermer`.",
			"",
			"### Cahier des charges",
			"",
			"1. Un appui (sur front) ouvre si le portail est fermé, ferme s'il est ouvert, arrête s'il est en mouvement.",
			"2. Après un arrêt en cours de course, l'appui suivant repart dans le sens inverse du dernier mouvement.",
			"3. Le bouton d'arrêt produit le même arrêt. En fermeture, la cellule provoque la réouverture.",
			"",
			"### Travail demandé",
			"",
			"Écrire d'abord le GRAFCET (sur papier), puis l'implanter en Ladder en trois blocs.",
		].join("\n"),
		create: createGateGrafcetLadderProject,
		solution: createGateGrafcetLadderSolution,
	},
];
