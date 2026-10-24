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
		statement: [
			"## Feu tricolore",
			"",
			"On souhaite piloter un feu de circulation à trois couleurs. Les sorties disponibles sont",
			"`rouge`, `orange` et `vert` ; une seule doit être active à la fois.",
			"",
			"### Travail demandé",
			"",
			"1. Écrire le GRAFCET qui fait défiler les phases dans l'ordre **vert → orange → rouge**, en boucle.",
			"2. Temporiser chaque phase : vert 5 s, orange 2 s, rouge 5 s.",
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
			"Une scène 3D (menu Interface → Scène 3D) montre le carrefour : des voitures arrivent en continu sur les quatre branches et obéissent aux feux.",
			"Si les deux axes passent au vert en même temps, ou sans temps de dégagement suffisant, les voitures **se percutent** : la collision est affichée, le compteur d'accidents augmente et le flux de voitures est réinitialisé.",
			"",
			"### Travail demandé",
			"",
			"1. Faire fonctionner les deux feux d'un même axe **en parallèle** (même couleur au même instant).",
			"2. Alterner les deux axes en respectant une phase de **tout-au-rouge** entre chaque changement.",
			"3. Temporiser les phases et valider le cycle complet en simulation, en vérifiant dans la scène 3D qu'aucune collision ne se produit.",
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
			"Les capteurs de fin de course `h` (foret en haut) et `b` (foret en bas), ainsi que la course du foret `position`,",
			"sont fournis par la scène 3D (menu Interface → Scène 3D) : le foret y descend, tourne et perce la pièce.",
			"",
			"### Travail demandé",
			"",
			"1. Au repos, la table est en position haute, broche à l'arrêt.",
			"2. Sur appui de `dcy` : mettre la broche en rotation puis descendre jusqu'à `b`.",
			"3. Maintenir le perçage 3 s en position basse, puis remonter jusqu'à `h` et arrêter la broche.",
			"4. Le cycle ne redémarre que sur un nouvel appui de `dcy`.",
			"5. Valider en simulation avec la scène 3D et l'animation de l'IHM.",
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
			"`etage_0..2` et `porte_ouverte`, ainsi que la hauteur de la cabine `position`, sont fournis par la scène 3D",
			"(menu Interface → Scène 3D) : la cabine et sa porte y sont animées, la porte reste ouverte au moins 2 s.",
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
			"Un parking de 4 places possède une barrière d'entrée et une barrière de sortie. Entrées : `dem_entree` et",
			"`dem_sortie` (une voiture attend devant la barrière d'entrée / de sortie) et `passage` (cellule sous une barrière,",
			"vraie tant qu'une voiture s'y trouve), fournies par la scène 3D (menu Interface → Scène 3D).",
			"Sorties : `barriere_entree`, `barriere_sortie` (ouverture) et `complet` (voyant).",
			"Le nombre de places occupées est suivi dans `places`, affiché sur le pupitre. Les boutons « Arrivée » et « Sortie »",
			"de la scène font apparaître des voitures, qui s'alignent et n'avancent que si leur barrière est ouverte.",
			"",
			"### Travail demandé",
			"",
			"1. Sur `dem_entree`, si le parking n'est pas complet : ouvrir la barrière d'entrée, incrémenter `places`.",
			"2. Sur `dem_sortie`, si le parking n'est pas vide : ouvrir la barrière de sortie, décrémenter `places`.",
			"3. Allumer `complet` dès que toutes les places sont occupées et refuser les nouvelles entrées.",
			"4. Refermer la barrière une fois la voiture passée (`passage`), puis valider en simulation avec la scène 3D.",
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
			"fins de course `cpt_px_out` / `cpt_px_in`) aiguillent la caisse. `P1` la pousse hors de",
			"`T1` sur le canal, puis `Cmd_T2T3` la conduit le long du canal : elle s'arrête au niveau de",
			"`P2` (capteur `cpt_psce_p2`) si elle est basse, au niveau de `P3` (capteur `cpt_psce_p3`)",
			"si elle est haute. Le compteur `C` totalise les caisses triées.",
			"",
			"### Travail demandé",
			"",
			"1. Sur `dcy`, démarrer les tapis (`Cmd_T2T3` mémorisé, `Cmd_T1` tant qu'une caisse circule).",
			"2. Caisse **basse** : la pousser avec `P1`, attendre qu'elle soit au niveau de `P2`, puis l'évacuer vers `T2` avec `P2`.",
			"3. Caisse **haute** : la pousser avec `P1`, attendre qu'elle soit au niveau de `P3`, puis l'évacuer vers `T3` avec `P3`.",
			"4. Incrémenter `C` à chaque caisse triée ; après 2 caisses, réinitialiser le cycle complet.",
			"5. Vérifier le tri en simulation dans la scène 3D (bouton « Placer la caisse », sélecteur de hauteur de caisse).",
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
			"3. Donnez la même réceptivité aux deux branches et lisez le message du panneau d'analyse,",
			"   puis rétablissez des réceptivités exclusives.",
		].join("\n"),
		create: createOrDivergenceProject,
		solution: createOrDivergenceSolution,
	},
	{
		id: "ladder-and-or",
		hiddenFromCatalog: true,
		statement: [
			"## Contacts en série et en parallèle",
			"",
			"Entrées : `a`, `b` (deux commutateurs qui gardent leur position, à 0 au repos). Sorties : `s_et`, `s_ou`.",
			"",
			"### Travail demandé",
			"",
			"1. Ouvrir le programme Main : deux réseaux, l'un sous l'autre.",
			"2. Lancer la simulation, puis basculer `a` et `b` dans les quatre combinaisons.",
			"3. Comparer `s_et` et `s_ou` avec la table de vérité de la théorie.",
		].join("\n"),
		create: createLadderAndOrProject,
	},
	{
		id: "ladder-reading",
		hiddenFromCatalog: true,
		statement: [
			"## Lire un programme Ladder",
			"",
			"Entrées : `a`, `b`, `c` (trois commutateurs qui gardent leur position, à 0 au repos). Sorties : `s1`, `s2`, `s3`, `s4`.",
			"",
			"### Travail demandé",
			"",
			"1. Ouvrir le programme Main : quatre réseaux les uns sous les autres.",
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
			"4. Si une prédiction diffère, relire le réseau concerné contact par contact.",
			"5. Expliquer pourquoi `s3` s'éteint quand `b` est actionné.",
		].join("\n"),
		create: createLadderReadingProject,
	},
	{
		id: "ladder-logic",
		hiddenFromCatalog: true,
		statement: [
			"## Éclairage en va-et-vient",
			"",
			"Entrées : `inter1`, `inter2`, `validation` (trois commutateurs maintenus, à 0 au repos). Sortie : `lampe`.",
			"",
			"### Travail demandé",
			"",
			"Dans le programme Main, on veut réaliser le comportement suivant :",
			"",
			"- La lampe change d'état quand on actionne l'un ou l'autre des deux interrupteurs (va-et-vient).",
			"- La lampe ne s'allume que si `validation` est active.",
			"",
			"1. Remplir la table de vérité de la lampe (avec `validation` actif).",
			"2. Écrire le réseau qui commande `lampe`.",
			"3. Vérifier les quatre combinaisons en simulation, avec `validation` actif puis inactif.",
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
			"Entrées : `marche` et `arret` (deux boutons poussoirs câblés à fermeture (NO) : 0 au repos, 1 tant qu'on appuie). Sortie : `pompe`.",
			"",
			"### Travail demandé",
			"",
			"1. Un appui sur `marche` démarre la pompe, qui reste en marche après le relâchement du bouton.",
			"2. Un appui sur `arret` l'arrête.",
			"3. Si on appuie sur les deux en même temps, la pompe reste éteinte (arrêt prioritaire).",
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
			"Entrées : `avant`, `arriere`, `arret` (trois boutons poussoirs câblés à fermeture (NO), à 0 au repos). Sorties : `moteur_av`, `moteur_ar`.",
			"",
			"### Travail demandé",
			"",
			"1. `avant` démarre `moteur_av`, qui reste en marche après le relâchement (auto-maintien à arrêt prioritaire).",
			"2. `arriere` démarre `moteur_ar` de la même façon.",
			"3. `arret` coupe les deux sorties.",
			"4. Quand un sens est en marche, un appui sur l'autre bouton est sans effet.",
			"5. Les deux sorties ne sont jamais vraies en même temps (court-circuit sur de vrais contacteurs).",
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
			"Le Main contient l'auto-maintien de la pompe, déjà écrit : il s'agit d'ajouter les réseaux de défaut. Nouvelles entrées : `temperature_ok` (capteur câblé à ouverture, un commutateur maintenu : 1 au repos, 0 en cas de surchauffe), `acquit` (bouton poussoir). Nouvelle sortie : `voyant_defaut`.",
			"",
			"### Travail demandé",
			"",
			"1. Une surchauffe (`temperature_ok` passe à 0) arrête la pompe et allume `voyant_defaut`.",
			"2. Le voyant reste allumé même si la température redevient normale (défaut mémorisé).",
			"3. Un appui sur `acquit` éteint le voyant, une fois le défaut disparu.",
			"4. Après acquittement, la pompe ne redémarre pas seule : il faut un nouvel appui sur `marche`.",
			"",
			"Scénario de test : température normale et appui sur `marche` (pompe à 1), surchauffe (pompe à 0, voyant à 1), retour à la normale (voyant toujours à 1), appui sur `acquit` (voyant à 0, pompe à 0), appui sur `marche` (pompe à 1).",
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
			"Une même entrée `commut` (commutateur, qui garde sa position) pilote trois sorties : `s_no` (contact NO), `s_p` (contact P), `s_n` (contact N), chacune par une bobine S. `raz` remet les trois à zéro.",
			"",
			"### Travail demandé",
			"",
			"1. En simulation pas à pas, mettre `commut` à 1, avancer de plusieurs cycles, puis le remettre à 0.",
			"2. Relever cycle par cycle l'état des trois **contacts** (couleur dans l'éditeur) et des trois sorties : c'est un chronogramme. Les sorties étant mémorisées par S, appuyer sur `raz` entre deux essais.",
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
			"Entrée : `bp` (bouton poussoir). Sortie : `lampe`. Mémoire : `imp`. L'exercice part d'une solution naïve à deux réseaux (un contact P sur `bp`, une bobine S puis une bobine R sur `lampe`), sur laquelle la lampe ne s'allume jamais.",
			"",
			"### Travail demandé",
			"",
			"1. Simuler la solution naïve : constater que la lampe ne s'allume jamais.",
			"2. Expliquer pourquoi, en déroulant un cycle réseau par réseau sur papier.",
			"3. Corriger le programme : la lampe doit basculer une seule fois par appui, même bouton maintenu plusieurs cycles.",
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
			"Seules les sorties `ouvrir` et `fermer` sont déclarées. Six entrées à déclarer : `bp_ouvrir` et `bp_fermer` (boutons poussoirs), `arret` (bouton poussoir câblé à ouverture), `fc_ouvert` et `fc_ferme` (fins de course, vraies quand le portail est au bout), `barriere_immaterielle` (cellule photoélectrique, vraie quand le faisceau est coupé).",
			"",
			"### Travail demandé",
			"",
			"1. Déclarer les six entrées dans la table des variables (mnémonique, type booléen, comportement).",
			"2. `bp_ouvrir` ouvre le portail jusqu'à `fc_ouvert`, `bp_fermer` le ferme jusqu'à `fc_ferme`.",
			"3. Les deux sens sont verrouillés : un appui sur l'autre bouton en cours de mouvement est ignoré.",
			"4. `arret` coupe le mouvement en cours (arrêt prioritaire).",
			"5. Si la cellule est coupée pendant la fermeture, le portail s'arrête et se rouvre. Pendant l'ouverture ou à l'arrêt, la cellule est ignorée.",
			"6. Ce type d'équipement relève de l'EN 12453.",
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
			"Un bouton `bp` (bouton poussoir, vrai tant qu'on appuie) pilote en parallèle un `TON`, un `TOF` et un `TP` réglés sur 2 s : leurs sorties sont `q_ton`, `q_tof` et `q_tp`. Il n'y a rien à écrire ni à modifier.",
			"",
			"### Séquence d'appuis sur `bp`",
			"",
			"| Appui | Début | Fin |",
			"| --- | --- | --- |",
			"| 1 (long) | 1 s | 5 s |",
			"| 2 (court : moins que PT) | 8 s | 9 s |",
			"| 3 (pendant l'impulsion du `TP`) | 9,5 s | 12 s |",
			"",
			"### Travail demandé",
			"",
			"1. Sans lancer la simulation, tracer sur papier le chronogramme des trois sorties pour cette séquence.",
			"2. Lancer la simulation, reproduire la séquence avec `bp` (à une seconde près) et comparer avec les sorties.",
		].join("\n"),
		create: createLadderTimersReadingProject,
	},
	{
		id: "ladder-timers",
		hiddenFromCatalog: true,
		statement: [
			"## Démarrage étoile-triangle",
			"",
			"Un gros moteur triphasé démarre en étoile (tension réduite) puis passe en triangle (pleine tension). Chaque branchement est fermé par un contacteur : un contacteur de ligne, un contacteur étoile et un contacteur triangle.",
			"",
			"| Variable | Rôle | Nature |",
			"| --- | --- | --- |",
			"| `marche` | démarre le moteur | bouton poussoir (vrai tant qu'on appuie) |",
			"| `arret` | arrête le moteur | bouton poussoir (vrai tant qu'on appuie) |",
			"| `km_ligne`, `km_etoile`, `km_triangle` | contacteurs de ligne, étoile et triangle | sorties |",
			"| `ventilateur` | refroidissement du moteur | sortie |",
			"| `inter_clignotant` | marche du clignotant (facultatif) | interrupteur |",
			"| `voyant` | voyant du clignotant (facultatif) | sortie |",
			"",
			"### Cahier des charges",
			"",
			"1. Après un appui sur `marche`, le moteur démarre en étoile pendant 5 s (`km_ligne` et `km_etoile`), puis passe en triangle (`km_ligne` et `km_triangle`).",
			"2. `arret` arrête le moteur à tout moment (arrêt prioritaire).",
			"3. Étoile et triangle ne sont jamais fermés en même temps : programmer le verrouillage (un contact NF de l'autre contacteur dans chaque réseau). Sur une vraie machine il est aussi câblé, ici le programme doit le garantir.",
			"4. Le ventilateur reste actif 10 s après l'arrêt du moteur (après la retombée de `km_ligne`).",
			"5. Facultatif : un temps mort (par exemple 200 ms) entre l'étoile et le triangle ; un clignotant réglable (1 s éteint, 1 s allumé) à deux `TON` croisés, mis en marche par `inter_clignotant`.",
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
			"Toutes les variables sont fournies. Le comptage se fait sur front montant. Pour chaque compteur, seule l'entrée de comptage est câblée sur le rail ; PV, R, LD et CD (d'un CTUD) se saisissent sur les broches.",
			"",
			"### Travail demandé",
			"",
			"1. Convoyeur (`CTU`, présélection 5) : entrée `capteur_piece`, remise à zéro par `raz`. Le convoyeur (`convoyeur`) tourne et s'arrête à la 5e pièce.",
			"2. Zone tampon (`CTUD`, capacité 3) : `capteur_entree` compte, `capteur_sortie` décompte, `raz_tampon` remet à zéro et `charge_tampon` charge PV. Voyant `tampon_plein` sur `QU` (le tampon contient PV pièces), voyant `tampon_vide` sur `QD`.",
			"3. Facultatif : stock de pièces (`CTD`, 4 pièces au départ) : `charge_stock` charge PV sur LD, `capteur_prelevement` décompte, voyant `stock_vide` sur `Q`.",
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
			"| Variable | Rôle | Nature |",
			"| --- | --- | --- |",
			"| `niveau` | niveau de la cuve, de 0 à 100 % | entrée analogique (curseur) |",
			"| `pompe` | pompe de remplissage | sortie |",
			"| `alarme` | alarme de niveau très haut | sortie |",
			"| `nb_demarrages` | nombre de démarrages de la pompe | mémoire (entier) |",
			"",
			"### Travail demandé",
			"",
			"1. La pompe démarre sous 20 %, s'arrête au-dessus de 80 % (hystérésis : la pompe garde son état entre les deux seuils, il faut donc une mémoire).",
			"2. Alarme au-dessus de 95 %.",
			"3. Le Main contient déjà un réseau qui incrémente `nb_demarrages` sous un contact NO : régler `niveau` avec le curseur et constater en simulation que le compteur augmente à chaque cycle tant que la pompe tourne, puis corriger avec un contact P.",
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
			"`niveau` n'est plus une entrée : c'est une mémoire entière (INT) à calculer à partir de `brut` (curseur de 0 à 27648). Le Main contient le corrigé de la cuve. Variables intermédiaires fournies : `calcul_int` (INT), `calcul_dint` (DINT), `calcul_real` (REAL).",
			"",
			"### Travail demandé",
			"",
			"1. Calculer `calcul_int := brut * 100` : pour `brut` = 13824, constater le rebouclage (6144 au lieu de 1382400). Puis `calcul_int := calcul_int / 27648` et `niveau := calcul_int`.",
			"2. Essayer de diviser d'abord (`calcul_int := brut / 27648`, puis `* 100`) : constater la troncature.",
			"3. Corriger en calculant dans `calcul_real` (copie de `brut`, `* 100`, `/ 27648`) puis en convertissant vers `niveau`.",
			"4. Variante : le même calcul dans `calcul_dint`.",
			"",
			"Résultats attendus pour `niveau` : `brut` = 0, 13824 et 27648 doivent donner 0, 50 et 100.",
		].join("\n"),
		create: createLadderScalingProject,
		solution: createLadderScalingSolution,
	},
	{
		id: "ladder-subprograms",
		hiddenFromCatalog: true,
		statement: [
			"## Appeler un sous-programme",
			"",
			"Le Main commande la marche d'un convoyeur ; le ladder « Comptage » (un `CTU` de présélection 3 et son voyant) existe mais aucun bloc ne l'appelle.",
			"",
			"| Variable | Rôle | Nature |",
			"| --- | --- | --- |",
			"| `marche`, `arret` | démarre et arrête le convoyeur | boutons poussoirs (vrais tant qu'on appuie) |",
			"| `capteur_piece` | détecte chaque pièce | capteur |",
			"| `raz` | remet le comptage à zéro | bouton poussoir |",
			"| `convoyeur` | moteur du convoyeur | sortie |",
			"| `voyant_lot` | allumé quand 3 pièces sont comptées | sortie |",
			"",
			"### Travail demandé",
			"",
			"1. Lire le ladder « Comptage », lancer l'analyse (avertissement : ladder non appelé) puis la simulation : `voyant_lot` ne s'allume pas.",
			"2. Dans le Main, ajouter un réseau et y faire glisser « Comptage » depuis la section « Programmes » de l'explorateur. Relier le bloc d'appel au rail, sans condition.",
			"3. Vérifier : après trois passages de `capteur_piece`, `voyant_lot` s'allume ; `raz` le fait retomber.",
			"4. Expérience : placer un contact NO sur `convoyeur` devant le bloc d'appel. Convoyeur à l'arrêt, laisser `capteur_piece` à vrai puis démarrer le convoyeur : `cpt` compte une pièce jamais comptée. Expliquer pourquoi.",
		].join("\n"),
		create: createLadderSubprogramsProject,
		solution: createLadderSubprogramsSolution,
	},
	{
		id: "ladder-packing",
		hiddenFromCatalog: true,
		statement: [
			"## Mise en caisse",
			"",
			"Aucune variable n'est fournie : établir puis déclarer la table complète des entrées, sorties et mémoires (nom, rôle, type, nature, comportement physique des entrées).",
			"",
			"### Cahier des charges",
			"",
			"1. Convoyeur en marche/arrêt : un appui sur Marche le démarre, un appui sur Arrêt l'arrête (arrêt prioritaire).",
			"2. Le relais thermique est câblé à ouverture : en fonctionnement normal son contact est fermé (variable vraie), un défaut la fait passer à faux (front descendant). Un défaut arrête le convoyeur et est mémorisé ; une fois disparu, il faut un nouvel appui sur Marche.",
			"3. Voyant de défaut : clignotant (base de temps système `_SYS_TB_500ms`) tant que le défaut n'est pas acquitté par le bouton Acquit, fixe s'il est acquitté mais encore présent, éteint une fois disparu.",
			"4. Comptage des pièces sur front montant du capteur, présélection de 5 ; à la 5e pièce, arrêt du convoyeur pendant 5 s (changement de caisse), puis redémarrage automatique et remise à zéro du compteur.",
			"5. Structurer en sous-programmes appelés sans condition par le Main.",
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
			"GRAFCET : E0 (initiale) → `dcy` → E1 (`sortie1`) → `fin1` → E2 (`sortie2`) → `fin2` → E3 → VRAI → E0. Le Main l'implante avec un auto-maintien par étape : chaque étape est activée par l'étape précédente et désactivée par l'étape suivante.",
			"",
			"Entrées : `dcy` (bouton poussoir), `fin1` et `fin2` (fins de course). Sorties : `sortie1` et `sortie2`. Mémoires d'étape : `X0` à `X3`.",
			"",
			"Le GRAFCET est dessiné dans le projet (programme « Séquence » de l'explorateur) : consultez-le pour comparer avec le Main. Il est exclu de l'exécution, seul le Ladder est simulé.",
			"",
			"### Travail demandé",
			"",
			"1. Lancer la simulation en pas à pas (« Avancer d'un cycle ») et ajouter `X0` à `X3`, `dcy`, `fin1`, `sortie1` et `sortie2` à la table de visualisation.",
			"2. Activer `dcy`, puis `fin1` : combien d'étapes sont actives après le franchissement, et pendant combien de cycles ?",
			"3. Revenir à l'étape `X0`, puis rendre `dcy` et `fin1` vrais en même temps : que se passe-t-il ?",
			"4. Expliquer ce qui se passe. Pas de programme à écrire.",
		].join("\n"),
		create: createLinearSequenceNaiveLadderProject,
	},
	{
		id: "linear-sequence-ladder",
		hiddenFromCatalog: true,
		statement: [
			"## Séquence linéaire en Ladder",
			"",
			"GRAFCET : E0 (initiale) → `dcy` → E1 (`sortie1`) → `fin1` → E2 (`sortie2`) → `fin2` → E3 → VRAI → E0. Actions continues.",
			"",
			"Entrées : `dcy` (bouton poussoir), `fin1` et `fin2` (fins de course). Sorties : `sortie1` et `sortie2`. Mémoires fournies : `X0` à `X3` (une par étape), `T0` à `T3` (une par transition) et `init`.",
			"",
			"### Travail demandé",
			"",
			"Implanter le GRAFCET avec la méthode en trois blocs :",
			"",
			"1. Activer `X0` au démarrage, une seule fois.",
			"2. Conditions de franchissement : un réseau par transition.",
			"3. Évolution des étapes : tous les reset, puis tous les set.",
			"4. Sorties : un réseau par sortie.",
			"",
			"### Comment savoir que c'est juste",
			"",
			"- Au démarrage, seule `X0` est vraie ; `dcy` active `X1` seule et allume `sortie1` ; `fin1` active `X2` seule ; `fin2` active `X3`, puis un cycle plus tard `X0`.",
			"- Avec `dcy` et `fin1` vrais ensemble, une seule transition est franchie par cycle.",
			"- Le panneau d'analyse n'indique aucune erreur.",
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
			"La partie opérative (la machine : foret, moteur, capteurs) est fournie, appelée par le Main : ne la modifiez pas. Entrées : `dcy` (bouton poussoir, départ de cycle), `h` (foret en haut), `b` (foret en bas) et `blocage` (interrupteur qui simule un foret bloqué : le foret n'avance plus en descente tant qu'il est vrai). Sorties : `descendre`, `monter` et `broche`. Mémoires fournies : `defaut`, `X0` à `X3`, `T0` à `T4` et `init`.",
			"",
			"### Travail demandé",
			"",
			"1. Implanter le GRAFCET du poste : `dcy` → descente (`descendre`, `broche`) jusqu'à `b` → perçage 2 s (`broche`, un `TON`) → remontée (`monter`, `broche`) jusqu'à `h`.",
			"2. Surveiller la descente : si le foret n'atteint pas `b` en 8 s (un second `TON`), `defaut` est mémorisé et le foret remonte directement. Un nouvel appui sur `dcy` efface `defaut`. Tester en actionnant `blocage`.",
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
			"GRAFCET : E0 → `dcy1` → E1 (`sortie1`) → `fin1` → E0 ; E0 → `dcy2` → E2 (`sortie2`) → `fin2` → E0.",
			"",
			"Entrées : `dcy1` et `dcy2` (boutons poussoirs), `fin1` et `fin2` (fins de course). Sorties : `sortie1` et `sortie2`. Mémoires fournies : `X0` à `X2`, `T0` à `T3` et `init`.",
			"",
			"### Travail demandé",
			"",
			"1. Implanter le GRAFCET en trois blocs.",
			"2. Simuler `dcy1` seul, puis `dcy2` seul : une seule branche est franchie.",
			"3. Rendre `dcy1` et `dcy2` vrais en même temps : les deux branches s'activent, c'est presque toujours une erreur de conception. Rendre les réceptivités exclusives (`dcy1 ET NON dcy2`, `dcy2 ET NON dcy1`) est un prolongement facultatif.",
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
			"GRAFCET : E0 → `dcy` → E1 (`sortie1`) et E2 (`sortie2`) → `capteur1 ET capteur2` → E0.",
			"",
			"Entrées : `dcy` (bouton poussoir), `capteur1` et `capteur2`. Sorties : `sortie1` et `sortie2`. Mémoires fournies : `X0` à `X2`, `T0`, `T1` et `init`.",
			"",
			"### Travail demandé",
			"",
			"1. Implanter le GRAFCET en trois blocs : une transition (`T0`) active `X1` et `X2` ; une transition (`T1`) exige `X1`, `X2` et les deux capteurs, et désactive les deux étapes.",
			"2. Vérifier : après `dcy`, les deux sorties sont vraies ; avec `capteur1` seul, rien ne change ; dès que `capteur1` et `capteur2` sont vrais, retour à `X0`.",
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
			"GRAFCET : E0 vert 5 s → E1 orange 2 s → E2 rouge 5 s → E0.",
			"",
			"Entrées : `arret` (bouton poussoir câblé à ouverture), `marche` (interrupteur). Sorties : `vert`, `orange` et `rouge`. Mémoires fournies : `X0` à `X2`, `T0` à `T2` et `init`.",
			"",
			"### Travail demandé",
			"",
			"1. Programme de base : implanter le GRAFCET avec trois `TON` (par exemple `t_vert`, `t_orange` et `t_rouge`), en boucle.",
			"2. Arrêt immédiat : `arret` réinitialise le GRAFCET (étapes à zéro, étape initiale réactivée).",
			"3. Arrêt en fin de cycle : `marche` est ajouté à la réceptivité qui reboucle (`t_rouge.Q ET marche`), le feu termine son cycle et reste au rouge tant que `marche` est faux.",
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
			"GRAFCET de commande : E0 → `dem_entree ET places < 4` → E1 (`barriere`, `places := places + 1`) → `passage` → E2 → NON `passage` → E0 ; E0 → `dem_sortie ET places > 0` → E3 (`barriere`, `places := places - 1`) → `passage` → E4 → NON `passage` → E0. La signalisation (`complet`) est déjà implantée.",
			"",
			"Entrées : `dem_entree`, `dem_sortie` et `passage` (boutons poussoirs), `arret` (câblé à ouverture). Sorties : `barriere` et `complet`. Mémoire entière : `places`. Mémoires fournies : `X0` à `X4`, `T0` à `T5` et `init`.",
			"",
			"### Travail demandé",
			"",
			"1. Implanter la commande en trois blocs, avec incrément et décrément sur front d'étape (contact P sur l'étape).",
			"2. Ajouter une réinitialisation de la commande sur `arret`.",
			"3. Réfléchir : que devient `places` après un arrêt ? Faut-il le remettre à zéro, et dans quel cas ?",
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
			"Entrées : `telecommande` (un seul bouton), `arret` (câblé à ouverture), `fc_ouvert` et `fc_ferme` (fins de course), `barriere_immaterielle` (cellule photoélectrique de détection d'obstacle, vraie quand le faisceau est coupé). Sorties : `ouvrir` et `fermer`. La mémoire `init` est déjà créée : une fois le GRAFCET dessiné, déclarer les mémoires d'étape et de franchissement.",
			"",
			"### Cahier des charges",
			"",
			"1. Un appui (sur front) ouvre si le portail est fermé, ferme s'il est ouvert, arrête s'il est en mouvement.",
			"2. Après un arrêt en cours de course, l'appui suivant repart dans le sens inverse du dernier mouvement.",
			"3. Le bouton d'arrêt produit le même arrêt. En fermeture, la cellule provoque la réouverture.",
			"",
			"### Travail demandé",
			"",
			"Écrire d'abord le GRAFCET (sur papier, ou en ajoutant un programme GRAFCET au projet, exclu de l'exécution), puis l'implanter en Ladder en trois blocs.",
		].join("\n"),
		create: createGateGrafcetLadderProject,
		solution: createGateGrafcetLadderSolution,
	},
];
