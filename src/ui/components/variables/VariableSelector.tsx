"use client";

import { isTimeLiteral } from "@/expression-language/time-literal";
import Variable, { VariableDirection, VariableType } from "@/schemas/variable/variable.schema";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { Autocomplete, Box, Paper, PaperProps, SxProps, TextField, Theme, useTheme } from "@mui/material";
import {
	FocusEvent as ReactFocusEvent,
	KeyboardEvent as ReactKeyboardEvent,
	forwardRef,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import { useShallow } from "zustand/shallow";

type SelectorStatus = "undeclared" | "wrong-type" | "excluded-direction" | "ok" | null;

type VariableColumn = "address" | "mnemonic" | "type" | "scope";

// Pas de libellé pour "address" : sans texte à faire tenir, la colonne peut rester étroite
// sans être coupée ni forcer l'en-tête à s'élargir.
const COLUMNS: Record<VariableColumn, { label: string; width: number }> = {
	address: { label: "", width: 40 },
	mnemonic: { label: "Mnémonique", width: 180 },
	type: { label: "Type", width: 60 },
	scope: { label: "Scope", width: 70 },
};

const ALL_COLUMNS = Object.keys(COLUMNS) as VariableColumn[];

const MIN_WIDTH_PX = 44;

let measureCanvas: HTMLCanvasElement | null = null;

/**
 * `.MuiAutocomplete-input` a `width: 0` en dur côté MUI (il grandit par flex-grow dans son
 * parent) : l'attribut natif `size` et un `width: auto` en CSS n'ont donc aucune prise sur lui.
 * Seule la racine du champ (le `TextField`) répond à un `width` explicite — on le calcule ici en
 * mesurant le texte réellement affiché, plutôt que de deviner une largeur fixe.
 */
function measureTextWidthPx(text: string, font: string): number {
	if (typeof document === "undefined") return 0;
	measureCanvas ??= document.createElement("canvas");
	const ctx = measureCanvas.getContext("2d");
	if (!ctx) return 0;
	ctx.font = font;
	return ctx.measureText(text).width;
}

const DIRECTION_LABELS: Record<VariableDirection, string> = {
	IN: "Entrée",
	OUT: "Sortie",
	INOUT: "Mémoire",
};

function cellValue(variable: Variable, column: VariableColumn): string {
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

function computeStatus(
	mnemonic: string,
	variables: { mnemonic: string; type: VariableType; getDirection(): VariableDirection }[],
	typeFilter?: VariableType[],
	excludeDirection?: VariableDirection,
	acceptsTimeLiteral?: boolean,
): SelectorStatus {
	const trimmed = mnemonic.trim();
	if (!trimmed) return null;
	// Une constante TIME (`T#...`) n'est jamais une variable déclarée — sa validité de format
	// est du ressort de l'analyseur (`TimerBlockAnalyser`), pas de ce composant.
	if (acceptsTimeLiteral && isTimeLiteral(trimmed)) return "ok";
	const match = variables.find((v) => v.mnemonic === trimmed);
	if (!match) return "undeclared";
	if (typeFilter && !typeFilter.includes(match.type)) return "wrong-type";
	if (excludeDirection && match.getDirection() === excludeDirection) return "excluded-direction";
	return "ok";
}

interface VariableSelectorProps {
	value: string;
	onCommit: (next: string) => void;
	/** Restreint les suggestions et le statut valide à ces types — non fourni : tous les types. */
	typeFilter?: VariableType[];
	/** Exclut les variables de cette direction des suggestions et du statut valide (ex :
	 * `"IN"` pour une bobine de ladder, voir `COIL_VARIABLE_IS_INPUT` dans `coil.analyser.ts`). */
	excludeDirection?: VariableDirection;
	/** Accepte, en plus d'un nom de variable, une constante TIME (`T#...`) — voir
	 * `BlockPortSpec.acceptsTimeLiteral`. Une telle constante n'est jamais signalée comme
	 * mnémonique non déclaré. */
	acceptsTimeLiteral?: boolean;
	/** Restreint les colonnes affichées dans le popup de suggestions — non fourni : les quatre.
	 * `mnemonic` reste toujours affichée, quel que soit `cols` : c'est la valeur éditée, sans
	 * elle le tableau ne permet plus d'identifier quelle ligne on choisit. */
	cols?: VariableColumn[];
	className?: string;
	sx?: SxProps<Theme>;
	baseInputSx?: SxProps<Theme>;
}

/** Permet à un parent (ex : double-clic n'importe où sur un nœud Ladder) de donner le focus au
 * champ sans passer par un clic sur le champ lui-même. */
export interface VariableSelectorHandle {
	startEditing: () => void;
}

function columnsGridTemplate(columns: VariableColumn[]): string {
	return columns.map((c) => `${COLUMNS[c].width}px`).join(" ");
}

/**
 * Champ d'édition d'un mnémonique de variable, avec autocomplétion (texte libre toujours
 * possible) et un signal visuel si le mnémonique ne correspond à aucune variable déclarée, à
 * une variable d'un type non attendu, ou d'une direction exclue. L'analyseur du projet reste la
 * seule source d'erreurs bloquantes — ce composant ne fait qu'assister la saisie.
 *
 * Un seul champ, en permanence éditable (pas de bascule affichage/édition) : au repos il est
 * épuré (pas de soulignement), et le focus/curseur natif suffit à signaler qu'on peut taper —
 * deux rendus séparés obligeaient à garder leur police et leur hauteur en synchronisation
 * manuelle, source d'un décalage visuel à chaque bascule.
 */
const VariableSelector = forwardRef<VariableSelectorHandle, VariableSelectorProps>(function VariableSelector(
	{ value, onCommit, typeFilter, excludeDirection, acceptsTimeLiteral, cols, className, sx, baseInputSx },
	ref,
) {
	const th = useTheme();
	const variables = useProjectStore(useShallow((s) => s.project?.variables ?? []));
	const inputRef = useRef<HTMLInputElement>(null);
	const [editingValue, setEditingValue] = useState(value);
	const [widthPx, setWidthPx] = useState(MIN_WIDTH_PX);

	useImperativeHandle(ref, () => ({ startEditing: () => inputRef.current?.focus() }), []);

	useEffect(() => {
		setEditingValue(value);
	}, [value]);

	// Recalculée après coup (pas en ligne pendant le rendu) : appliquer la nouvelle largeur dans
	// le même commit que la frappe fait parfois manquer le repaint à Chrome (le dernier caractère
	// reste invisible tant qu'on ne déplace pas le curseur) — un cycle de rendu séparé lui laisse
	// le temps de repeindre correctement la zone élargie.
	useEffect(() => {
		setWidthPx(
			Math.max(
				MIN_WIDTH_PX,
				measureTextWidthPx(editingValue || "?", `0.7rem ${th.typography.fontFamily}`) + 24,
			),
		);
	}, [editingValue, th.typography.fontFamily]);

	const activeColumns = useMemo(
		() => ALL_COLUMNS.filter((c) => c === "mnemonic" || !cols || cols.includes(c)),
		[cols],
	);

	const suggestions = useMemo(
		() =>
			variables.filter(
				(v) =>
					(!typeFilter || typeFilter.includes(v.type)) &&
					(!excludeDirection || v.getDirection() !== excludeDirection),
			),
		[variables, typeFilter, excludeDirection],
	);

	// Calculé ici (pas seulement dans `filterOptions`) pour aussi piloter l'affichage du popup :
	// sans ce filtrage explicite, MUI ouvrirait un popup vide (juste l'en-tête des colonnes) le
	// temps de taper une constante ne correspondant à aucune variable, ce qui a l'air d'un bug.
	const needle = editingValue.trim().toLowerCase();
	const filteredSuggestions = needle
		? suggestions.filter((s) => s.mnemonic.toLowerCase().includes(needle))
		: suggestions;

	const save = () => {
		const trimmed = editingValue.trim();
		if (trimmed && trimmed !== value) {
			onCommit(trimmed);
		} else {
			setEditingValue(value);
		}
	};

	const status = computeStatus(editingValue, variables, typeFilter, excludeDirection, acceptsTimeLiteral);
	const statusColor = status && status !== "ok" ? th.palette.error.main : undefined;

	const gridTemplateColumns = columnsGridTemplate(activeColumns);
	return (
		<Autocomplete
			freeSolo
			openOnFocus
			size="small"
			options={suggestions}
			getOptionLabel={(option) => (typeof option === "string" ? option : option.mnemonic)}
			inputValue={editingValue}
			onInputChange={(_, newValue) => setEditingValue(newValue)}
			// Filtrage maison plutôt que celui par défaut d'Autocomplete : ce dernier, dès qu'une
			// suggestion a déjà été cliquée une fois, réaffiche la liste entière non filtrée à
			// chaque réouverture tant que le texte n'a pas changé depuis (heuristique MUI interne
			// liée à sa notion de "valeur sélectionnée" — qu'on n'utilise pas, `editingValue` est
			// notre seule source de vérité). On filtre nous-mêmes sur `editingValue` pour un
			// comportement prévisible : toujours filtré par ce qui est effectivement affiché.
			filterOptions={() => filteredSuggestions}
			className={className}
			disableClearable
			forcePopupIcon={false}
			slotProps={{
				popper: {
					style: { width: activeColumns.reduce((sum, c) => sum + COLUMNS[c].width, 0) + 16 },
				},
			}}
			slots={{
				// `null` plutôt qu'un `Paper` vide (juste l'en-tête des colonnes) quand rien ne
				// correspond — sinon un bloc de suggestions apparaît en permanence pendant la saisie
				// d'une constante libre (ex. `T#5s`), qui ne correspond jamais à une variable.
				paper:
					filteredSuggestions.length === 0
						? () => null
						: ({ children, ...paperProps }: PaperProps) => (
								<Paper {...paperProps}>
									<Box
										sx={{
											display: "grid",
											gridTemplateColumns,
											px: 1,
											py: 0.5,
											borderBottom: `1px solid ${th.palette.divider}`,
											fontWeight: 700,
											fontSize: "0.75rem",
										}}
									>
										{activeColumns.map((c) => (
											<span key={c}>{COLUMNS[c].label}</span>
										))}
									</Box>
									{children}
								</Paper>
							),
			}}
			renderOption={(props, option) => {
				// `.MuiAutocomplete-option` porte son propre padding par défaut, différent de
				// celui de l'en-tête ci-dessus — sans le neutraliser ici, les cellules se
				// décalent par rapport aux titres de colonnes. Le style inline l'emporte sur
				// la classe, px/py restent donc les seuls responsables de l'alignement.
				const { key, style, ...optionProps } = props;
				return (
					<li key={key} {...optionProps} style={{ ...style, padding: 0 }}>
						<Box
							sx={{
								display: "grid",
								gridTemplateColumns,
								width: "100%",
								px: 1,
								py: 0.5,
								fontSize: "0.8rem",
							}}
						>
							{activeColumns.map((c) => (
								<span key={c}>{cellValue(option, c)}</span>
							))}
						</Box>
					</li>
				);
			}}
			renderInput={(params) => (
				<TextField
					{...params}
					inputRef={inputRef}
					variant="standard"
					placeholder="?"
					inputProps={{ ...params.inputProps, "data-variable-status": status ?? undefined }}
					// Fusionné à `params.InputProps` (pas remplacé) : il porte la `ref` et le
					// `onMouseDown` dont Autocomplete a besoin pour se positionner et s'ouvrir au
					// clic — un `slotProps.input` à côté les aurait purement et simplement écrasés.
					slotProps={{ input: { ...params.InputProps, disableUnderline: true } }}
					// `params.inputProps` porte les handlers réels d'Autocomplete (ouverture au focus,
					// navigation clavier de la liste, etc.) — les remplacer purement et simplement au
					// niveau du `TextField` les casse. On les rappelle explicitement avant d'ajouter
					// notre propre comportement.
					onBlur={(e) => {
						params.inputProps.onBlur?.(e as ReactFocusEvent<HTMLInputElement>);
						save();
					}}
					onKeyDown={(e) => {
						params.inputProps.onKeyDown?.(e as unknown as ReactKeyboardEvent<HTMLInputElement>);
						if (e.key === "Enter" || e.key === "Escape") inputRef.current?.blur();
					}}
					sx={[
						{
							// `!important` : `.MuiInputBase-inputSizeSmall` (ajoutée par `size="small"`) a
							// la même spécificité qu'une classe générée par `sx` et gagne parfois
							// l'arbitrage, laissant du padding/un `text-overflow: ellipsis` par défaut qui
							// tronquait le texte au lieu de laisser le champ s'élargir.
							"& .MuiInputBase-input": {
								color: statusColor,
								padding: "0 !important",
								textAlign: "center",
								fontSize: "0.7rem",
								cursor: "text",
								textOverflow: "clip !important",
								...(baseInputSx ?? {}),
							},
						},
						...(Array.isArray(sx) ? sx : [sx]),
						// L'emporte sur un `width` fixe passé par l'appelant (ex : compact dans un nœud
						// Ladder) : le champ doit pouvoir s'élargir avec le texte (voir
						// `measureTextWidthPx` — le pourquoi d'un calcul plutôt qu'un `auto`).
						{ width: widthPx },
					]}
				/>
			)}
		/>
	);
});

export default VariableSelector;
