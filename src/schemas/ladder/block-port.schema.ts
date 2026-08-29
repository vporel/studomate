import { LiteralKind } from "@/expression-language/literals/kind";
import { VariableType } from "../variable/variable.schema";

/**
 * `structural` : câblé sur le rail comme un contact/une bobine (EN/ENO, ex. IN/Q d'un timer).
 * `parameter` : pinoche à champ texte, pas câblée sur le rail (ex. PT/ET d'un timer).
 */
export type BlockPortKind = "structural" | "parameter";

/** Un port d'un bloc ladder — commun à toute famille de bloc, qu'elle soit une instance nommée
 * (timer, compteur) ou un bloc anonyme (comparaison, affectation). Chaque famille déclare la
 * liste des siens.
 *
 * `type` : le type de la valeur attendue sur la pinoche. `"ANY"` signifie « n'importe quel type,
 * la contrainte réelle est portée par l'analyseur » (ex. IN1/IN2 d'un bloc compare, dont
 * l'analyseur vérifie seulement qu'ils ont le même type entre eux) — n'est autorisé que sur une
 * pinoche `kind: "parameter"` / `generatesVariable: false` : un port structurel ou générateur de
 * variable a toujours besoin d'un type concret (voir `requireConcreteType`).
 *
 * `generatesVariable` : `false` pour une pinoche paramètre dont la valeur est résolue directement
 * depuis la saisie de l'utilisateur (ex. PT d'un timer : constante `T#...` ou nom d'une variable
 * existante) — elle n'a pas besoin de sa propre variable générée, contrairement à ET (qui stocke
 * une valeur calculée à chaque cycle, lisible ailleurs sous `<Nom>.ET`).
 *
 * `acceptedLiterals` : les formes de littéral acceptées en plus d'un nom de variable (voir
 * `LiteralKind`) — absent/vide : nom de variable uniquement. Ex. `["time"]` pour PT d'un timer,
 * `["number"]` pour PV d'un compteur, `["number", "boolean", "string"]` pour IN1/IN2 d'un compare.
 *
 * `excludeInputVariable` : `true` si la pinoche ne doit suggérer/accepter que des variables
 * inscriptibles (ex. `OUT` d'un bloc assign/arithmetic : on n'écrit jamais dans une entrée).
 */
export type BlockPortSpec = {
	suffix: string;
	type: VariableType | "ANY";
	kind: BlockPortKind;
	direction: "input" | "output";
	generatesVariable: boolean;
	acceptedLiterals?: LiteralKind[];
	excludeInputVariable?: boolean;
};

/** Le type concret d'un port — `"ANY"` est interdit sur un port structurel ou générateur de
 * variable (voir l'invariant de `BlockPortSpec`), ce resserrement est donc toujours sûr là où
 * un type concret est requis (génération de mnémoniques/variables exposées). */
export function requireConcreteType(spec: BlockPortSpec): VariableType {
	if (spec.type === "ANY")
		throw new Error(
			`Port ${spec.suffix} : le type "ANY" est interdit sur un port générant une variable.`,
		);
	return spec.type;
}

/**
 * Nombre de lignes de pins d'un bloc — jamais un nombre codé en dur par famille : une ligne
 * structurelle toujours présente (EN/ENO, IN/Q...), plus une ligne par rangée de paramètres
 * (ex. PT à gauche/ET à droite pour un timer partagent une seule ligne). Une famille à 3 entrées
 * paramètres et 1 sortie donnerait `1 + 3 = 4` sans rien changer ici. Base de l'empreinte du
 * bloc sur la grille (`getBlockHeightInCells`) et de la hauteur de rendu du nœud (voir
 * `block-node-layout` côté UI).
 */
export function getBlockPinRowCount(portSpecs: BlockPortSpec[]): number {
	const parameterPorts = portSpecs.filter((spec) => spec.kind === "parameter");
	const parameterInputRows = parameterPorts.filter(
		(spec) => spec.direction === "input",
	).length;
	const parameterOutputRows = parameterPorts.filter(
		(spec) => spec.direction === "output",
	).length;
	return 1 + Math.max(parameterInputRows, parameterOutputRows);
}

/**
 * Empreinte d'un bloc sur la grille d'une section, en cellules entières (la grille ne réserve
 * qu'en cellules pleines, voir `computeRowHeightsInCells`) : `ceil((lignes de pins + 1) / 2)` —
 * les lignes après la première sont mi-hauteur. 1 ligne → 1 cellule, 2-3 → 2, 4-5 → 3.
 */
export function getBlockHeightInCells(portSpecs: BlockPortSpec[]): number {
	return Math.ceil((getBlockPinRowCount(portSpecs) + 1) / 2);
}
