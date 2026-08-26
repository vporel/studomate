import { VariableDirection, VariableType } from "@/schemas/variable/variable.schema";
import { isNumberLiteral } from "@/expression-language/number-literal";
import { isTimeLiteral } from "@/expression-language/time-literal";

export type SelectorStatus = "undeclared" | "wrong-type" | "excluded-direction" | "ok" | null;

export type VariableColumn = "address" | "mnemonic" | "type" | "scope";

// Pas de libellé pour "address" : sans texte à faire tenir, la colonne peut rester étroite
// sans être coupée ni forcer l'en-tête à s'élargir.
export const COLUMNS: Record<VariableColumn, { label: string; width: number }> = {
	address: { label: "", width: 40 },
	mnemonic: { label: "Mnémonique", width: 180 },
	type: { label: "Type", width: 60 },
	scope: { label: "Scope", width: 70 },
};

export const ALL_COLUMNS = Object.keys(COLUMNS) as VariableColumn[];

const MIN_WIDTH_PX = 44;

let measureCanvas: HTMLCanvasElement | null = null;

const DIRECTION_LABELS: Record<VariableDirection, string> = {
	IN: "Entrée",
	OUT: "Sortie",
	INOUT: "Mémoire",
};

/**
 * `.MuiAutocomplete-input` a `width: 0` en dur côté MUI (il grandit par flex-grow dans son
 * parent) : l'attribut natif `size` et un `width: auto` en CSS n'ont donc aucune prise sur lui.
 * Seule la racine du champ (le `TextField`) répond à un `width` explicite — on le calcule ici en
 * mesurant le texte réellement affiché, plutôt que de deviner une largeur fixe.
 */
export function measureTextWidthPx(text: string, font: string): number {
	if (typeof document === "undefined") return 0;
	measureCanvas ??= document.createElement("canvas");
	const ctx = measureCanvas.getContext("2d");
	if (!ctx) return 0;
	ctx.font = font;
	return ctx.measureText(text).width;
}

export function cellValue(variable: { address?: string; mnemonic: string; type: string; getDirection(): VariableDirection }, column: VariableColumn): string {
	switch (column) {
		case "address":
			return variable.address || "—";
		case "mnemonic":
			return variable.mnemonic;
		case "type":
			return variable.type;
		case "scope":
			return DIRECTION_LABELS[variable.getDirection()];
	}
}

export function computeStatus(
	mnemonic: string,
	variables: { mnemonic: string; type: VariableType; getDirection(): VariableDirection }[],
	typeFilter?: VariableType[],
	excludeDirection?: VariableDirection,
	acceptsTimeLiteral?: boolean,
	acceptsNumberLiteral?: boolean,
): SelectorStatus {
	const trimmed = mnemonic.trim();
	if (!trimmed) return null;
	// Une constante TIME (`T#...`) ou un littéral numérique n'est jamais une variable déclarée —
	// sa validité de format est du ressort de l'analyseur (`TimerBlockAnalyser`/
	// `CounterBlockAnalyser`), pas de ce composant.
	if (acceptsTimeLiteral && isTimeLiteral(trimmed)) return "ok";
	if (acceptsNumberLiteral && isNumberLiteral(trimmed)) return "ok";
	const match = variables.find((v) => v.mnemonic === trimmed);
	if (!match) return "undeclared";
	if (typeFilter && !typeFilter.includes(match.type)) return "wrong-type";
	if (excludeDirection && match.getDirection() === excludeDirection) return "excluded-direction";
	return "ok";
}

export function columnsGridTemplate(columns: VariableColumn[]): string {
	return columns.map((c) => `${COLUMNS[c].width}px`).join(" ");
}

export function inputWidthPx(text: string, font: string): number {
	return Math.max(MIN_WIDTH_PX, measureTextWidthPx(text || "?", font) + 24);
}
