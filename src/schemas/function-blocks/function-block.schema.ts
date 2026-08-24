import Variable, { VariableType } from "../variable/variable.schema";

/**
 * `structural` : câblé sur le rail comme un contact/une bobine (EN/ENO, ex. IN/Q d'un timer).
 * `parameter` : pinoche à champ texte, pas câblée sur le rail (ex. PT/ET d'un timer).
 */
export type BlockPortKind = "structural" | "parameter";

/** Un port généré par un bloc, commun à toute famille de function block — prédéfinie (timer, et
 * plus tard comptage, comparaison...) ou, plus tard, déclarée par l'utilisateur (FB façon TIA
 * Portal). Chaque famille déclare la liste des siens.
 *
 * `generatesVariable` : `false` pour une pinoche paramètre dont la valeur est résolue directement
 * depuis la saisie de l'utilisateur (ex. PT d'un timer : constante `T#...` ou nom d'une variable
 * existante) — elle n'a pas besoin de sa propre variable générée, contrairement à ET (qui stocke
 * une valeur calculée à chaque cycle, lisible ailleurs sous `<Nom>.ET`).
 *
 * `acceptsTimeLiteral` : `true` si la pinoche accepte, en plus d'un nom de variable, une
 * constante TIME façon IEC 61131-3 (`T#...`, voir `time-literal.ts`) — seul PT d'un timer
 * aujourd'hui (voir `TimerBlockAnalyser`) ; ET référence toujours une variable.
 */
export type BlockPortSpec = {
	suffix: string;
	type: VariableType;
	kind: BlockPortKind;
	direction: "input" | "output";
	generatesVariable: boolean;
	acceptsTimeLiteral?: boolean;
};

/** Les mnémoniques plats générés pour un bloc nommé `name`, un par port de `portSpecs` dont
 * `generatesVariable` est vrai (ex. `Tempo1.IN`). */
export function getBlockVariableMnemonics(name: string, portSpecs: BlockPortSpec[]): Record<string, string> {
	return Object.fromEntries(
		portSpecs
			.filter((spec) => spec.generatesVariable)
			.map((spec) => [spec.suffix, `${name}.${spec.suffix}`]),
	);
}

/** Un nom de bloc partage son espace de noms avec les mnémoniques de variable : même règle de
 * validation. */
export function validateBlockName(name: string): string[] {
	return Variable.validateMnemonic(name, false);
}

/**
 * Hauteur du nœud, en lignes de pins — jamais un nombre codé en dur par famille : une ligne
 * structurelle toujours présente (EN/ENO, IN/Q...), plus une ligne par rangée de paramètres
 * (ex. PT à gauche/ET à droite pour un timer partagent une seule ligne). Une famille avec
 * plusieurs rangées de paramètres empilées à gauche/à droite (ex. un futur bloc à 3 entrées
 * paramètres et 1 sortie) obtiendrait `1 + 3 = 4` sans rien changer ici.
 */
export function getBlockPinRowCount(portSpecs: BlockPortSpec[]): number {
	const parameterPorts = portSpecs.filter((spec) => spec.kind === "parameter");
	const parameterInputRows = parameterPorts.filter((spec) => spec.direction === "input").length;
	const parameterOutputRows = parameterPorts.filter((spec) => spec.direction === "output").length;
	return 1 + Math.max(parameterInputRows, parameterOutputRows);
}

/**
 * Hauteur précise du nœud, en unités de cellule — la première ligne de pins occupe une cellule
 * pleine, chaque ligne suivante ne décale son point de départ que d'un demi-cellule (pas une
 * cellule entière) : `1 + (nombre de lignes - 1) * 0.5`. Valeur non arrondie, pour le rendu CSS
 * du nœud lui-même — voir `getBlockHeightInCells` pour la réservation dans la grille (entière).
 */
export function getBlockHeightInCellUnits(portSpecs: BlockPortSpec[]): number {
	return 1 + (getBlockPinRowCount(portSpecs) - 1) * 0.5;
}

/**
 * Nombre de cellules de grille à réserver pour ce bloc — la grille (`computeRowHeightsInCells`)
 * ne travaille qu'en cellules entières, d'où l'arrondi au-dessus de `getBlockHeightInCellUnits`.
 */
export function getBlockHeightInCells(portSpecs: BlockPortSpec[]): number {
	return Math.ceil(getBlockHeightInCellUnits(portSpecs));
}

/** Une ligne de pins paramètres affichable — une entrée à gauche, une sortie à droite, l'une des
 * deux pouvant être absente (voir `getParameterPinRows`). */
export type ParameterPinRow = { input?: BlockPortSpec; output?: BlockPortSpec };

/**
 * Regroupe les ports `kind: "parameter"` en lignes affichables : la n-ième entrée paramètre
 * partage sa ligne avec la n-ième sortie paramètre (PT/ET d'un timer, par exemple, forment une
 * seule ligne). Même comptage de lignes que `getBlockPinRowCount`, dont c'est la contrepartie
 * pour le rendu — jamais de rendu codé en dur par famille dans `BlockNode`.
 */
export function getParameterPinRows(portSpecs: BlockPortSpec[]): ParameterPinRow[] {
	const inputs = portSpecs.filter((spec) => spec.kind === "parameter" && spec.direction === "input");
	const outputs = portSpecs.filter((spec) => spec.kind === "parameter" && spec.direction === "output");
	const rowCount = Math.max(inputs.length, outputs.length);
	return Array.from({ length: rowCount }, (_, i) => ({ input: inputs[i], output: outputs[i] }));
}
