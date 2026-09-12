import Variable, {
	NativeType,
	VariableType,
} from "@/schemas/variable/variable.schema";

/** Reconnaît la syntaxe d'un littéral accepté par une pinoche (ex. `isTimeLiteral`), et sépare la
 * reconnaissance de la validité (ex. `T#abc` a la syntaxe d'une constante TIME mais n'en est pas
 * une valide) — voir `PinResolution` pour la distinction correspondante. */
export type PinLiteralCheck = {
	isLiteralSyntax: (pin: string) => boolean;
	isLiteralValid: (pin: string) => boolean;
};

export type PinResolution =
	| { kind: "empty" }
	| { kind: "literal" }
	| { kind: "invalid-constant" }
	| { kind: "undeclared" }
	| { kind: "invalid-type"; variable: Variable }
	| { kind: "ok"; variable: Variable };

/**
 * Décision partagée par toutes les pinoches paramètre d'un bloc système (PT/ET du timer, PV/CV/
 * contrôle du counter, ...) : vide, littéral (valide ou non), variable non déclarée, ou variable
 * déclarée du mauvais type natif. Ne construit aucune `ProjectAnalyserIssue` : chaque analyseur
 * garde son propre libellé de pinoche et son propre message, seule la logique de décision (le
 * point qui divergeait silencieusement entre timer et counter) est centralisée ici.
 *
 * `excludedVariableTypes` filtre sur le `VariableType` déclaré (`TIME`, `INT`...), pas sur le type
 * natif : `TIME` partage le type natif `number` avec les types réellement numériques (voir
 * `VARIABLE_TYPE_TO_NATIVE_TYPE`), ce qui suffit pour PT/ET d'un timer (qui acceptent l'un ou
 * l'autre) mais pas pour PV/CV d'un counter, où seul un nombre au sens strict est valide.
 */
export function resolveFunctionBlockPin(
	pin: string,
	variablesByMnemonic: Map<string, Variable>,
	expectedNativeType: NativeType,
	literal?: PinLiteralCheck,
	excludedVariableTypes?: VariableType[],
): PinResolution {
	if (!pin) return { kind: "empty" };
	if (literal && literal.isLiteralSyntax(pin)) {
		return literal.isLiteralValid(pin)
			? { kind: "literal" }
			: { kind: "invalid-constant" };
	}
	const variable = variablesByMnemonic.get(pin);
	if (!variable) return { kind: "undeclared" };
	if (variable.getNativeType() !== expectedNativeType)
		return { kind: "invalid-type", variable };
	if (excludedVariableTypes?.includes(variable.type))
		return { kind: "invalid-type", variable };
	return { kind: "ok", variable };
}
