import { Dialect } from "@/expression-language/dialect.enum";
import {
	LiteralKind,
	matchesAnyAcceptedLiteral,
} from "@/expression-language/literals/kind";
import {
	InputBehavior,
	InputBehaviorKind,
} from "@/schemas/variable/input-behavior";
import {
	VariableDirection,
	VariableType,
} from "@/schemas/variable/variable.schema";
import { SxProps, Theme } from "@mui/material";

export type SelectorStatus =
	| "undeclared"
	| "wrong-type"
	| "excluded-direction"
	| "excluded-behavior"
	| "ok"
	| null;

export type VariableColumn = "address" | "mnemonic" | "type" | "scope";

// Pas de libellé pour "address" : sans texte à faire tenir, la colonne peut rester étroite
// sans être coupée ni forcer l'en-tête à s'élargir.
export const COLUMNS: Record<VariableColumn, { label: string; width: number }> =
	{
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

export function cellValue(
	variable: {
		address?: string;
		mnemonic: string;
		type: string;
		getDirection(): VariableDirection;
	},
	column: VariableColumn,
): string {
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
	variables: {
		mnemonic: string;
		type: VariableType;
		behavior?: InputBehavior | null;
		getDirection(): VariableDirection;
	}[],
	typeFilter?: VariableType[],
	excludeDirection?: VariableDirection,
	acceptedLiterals?: LiteralKind[],
	dialect: Dialect = Dialect.FR,
	excludeBehaviorKinds?: readonly InputBehaviorKind[],
): SelectorStatus {
	const trimmed = mnemonic.trim();
	if (!trimmed) return null;
	// Un littéral d'un genre accepté n'est jamais une variable déclarée — sa validité de format
	// est du ressort de l'analyseur (`TimerBlockAnalyser`/`CounterBlockAnalyser`/
	// `CompareBlockAnalyser`), pas de ce composant.
	if (matchesAnyAcceptedLiteral(trimmed, acceptedLiterals, dialect))
		return "ok";
	const match = variables.find((v) => v.mnemonic === trimmed);
	if (!match) return "undeclared";
	if (typeFilter && !typeFilter.includes(match.type)) return "wrong-type";
	if (excludeDirection && match.getDirection() === excludeDirection)
		return "excluded-direction";
	if (hasExcludedBehavior(match, excludeBehaviorKinds))
		return "excluded-behavior";
	return "ok";
}

export function hasExcludedBehavior(
	variable: { behavior?: InputBehavior | null },
	excludeBehaviorKinds?: readonly InputBehaviorKind[],
): boolean {
	return (
		!!variable.behavior &&
		!!excludeBehaviorKinds?.includes(variable.behavior.kind)
	);
}

export function columnsGridTemplate(columns: VariableColumn[]): string {
	return columns.map((c) => `${COLUMNS[c].width}px`).join(" ");
}

// 1px/character beyond the padding: a canvas-measured width is occasionally a hair narrower
// than the input's actual rendered width (font rendering/rounding varies by OS and display),
// which clips the last characters of a long mnemonic — a flat margin isn't enough since the gap
// grows with the text length, so this one scales with it instead.
export function inputWidthPx(text: string, font: string): number {
	const measured = text || "?";
	return Math.max(
		MIN_WIDTH_PX,
		measureTextWidthPx(measured, font) + 24 + measured.length * 1,
	);
}

export type SimulationValueAlign = "left" | "center" | "right";

// Décalage du texte (input et valeur de simulation) par rapport au bord du champ quand il n'est
// pas centré, en mode compact — pour qu'il ne touche pas le trait du pin/contact (ex : `ParamPin`).
// En chaîne (`"3px"`), pas en nombre : dans `sx`, un nombre pour une prop d'espacement (`m`/`p`/
// `mr`/`ml`...) est multiplié par `theme.spacing()` (8px par défaut) au lieu d'être pris en px.
const EDGE_INSET_PX = "3px";

/** `textAlign` et décalage de bord associés à `align` — factorisés pour que l'input et la valeur
 * de simulation restent alignés l'un sur l'autre quel que soit `align` (voir `inputBaseSx` et
 * `simulationValueSx`). Marges en propriétés longues (`marginLeft`/`marginRight`), jamais le
 * raccourci `margin` : les deux dans un même style se marchent dessus de façon peu fiable selon
 * l'environnement (constaté avec jsdom en test). `withEdgeInset` : `false` en apparence bordée
 * (`label` fourni), qui a déjà le padding standard d'un `TextField` outlined. */
function alignEdgeSx(align: SimulationValueAlign, withEdgeInset: boolean) {
	switch (align) {
		case "left":
			return {
				textAlign: "left" as const,
				...(withEdgeInset ? { marginLeft: EDGE_INSET_PX } : {}),
			};
		case "right":
			return {
				textAlign: "right" as const,
				...(withEdgeInset ? { marginRight: EDGE_INSET_PX } : {}),
			};
		case "center":
			return { textAlign: "center" as const };
	}
}

/** Style de la valeur de simulation (`FormHelperText`) — `position: absolute` : le champ garde sa
 * taille sans valeur affichée, la valeur ne doit pas décaler le layout du parent (nœud Ladder,
 * panneau de propriétés). `.MuiFormControl-root` (racine du `TextField`, dont hérite ce texte)
 * est déjà `position: relative` par défaut, y compris quand l'appelant le passe en
 * `position: absolute` via `sx` (ex : `ParamPin`) — dans les deux cas c'est un bloc conteneur
 * valide pour ce positionnement. `align`/`label` pilotent aussi la position horizontale, avec le
 * même décalage de bord que l'input (`alignEdgeSx`) pour un alignement exact. */
export function simulationValueSx(
	position: "TOP" | "BOTTOM",
	align: SimulationValueAlign,
	label: string | undefined,
) {
	const { textAlign: _textAlign, ...edgeSx } = alignEdgeSx(align, !label);
	return {
		position: "absolute" as const,
		...(position === "TOP" ? { bottom: "100%" } : { top: "60%" }),
		...(align === "right"
			? { right: 0 }
			: align === "center"
				? { left: "50%", transform: "translateX(-50%)" }
				: { left: 0 }),
		...edgeSx,
		fontSize: "0.6rem",
		lineHeight: 1.2,
		whiteSpace: "nowrap" as const,
		pointerEvents: "none" as const,
		background: "rgba(0, 0, 0, 0.15)",
		padding: "0px 1px",
	};
}

/** Style de `.MuiInputBase-input` du champ — `!important` : `.MuiInputBase-inputSizeSmall`
 * (ajoutée par `size="small"`) a la même spécificité qu'une classe générée par `sx` et gagne
 * parfois l'arbitrage, laissant du padding/un `text-overflow: ellipsis` par défaut qui tronquait
 * le texte au lieu de laisser le champ s'élargir — non pertinent en apparence bordée (`label`
 * fourni), qui garde le padding standard d'un `TextField` outlined. */
export function inputBaseSx(
	label: string | undefined,
	align: SimulationValueAlign,
	statusColor: string | undefined,
	baseInputSx: SxProps<Theme> | undefined,
) {
	return label
		? {
				color: statusColor,
				cursor: "text",
				...alignEdgeSx(align, false),
				...(baseInputSx ?? {}),
			}
		: {
				color: statusColor,
				padding: "0 !important",
				fontSize: "0.7rem",
				cursor: "text",
				textOverflow: "clip !important",
				...alignEdgeSx(align, true),
				...(baseInputSx ?? {}),
			};
}
