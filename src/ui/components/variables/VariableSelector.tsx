"use client";

import { Dialect } from "@/expression-language/dialect.enum";
import { LiteralKind } from "@/expression-language/literals/kind";
import Variable, {
	VariableDirection,
	VariableType,
} from "@/schemas/variable/variable.schema";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import {
	Autocomplete,
	SxProps,
	TextField,
	Theme,
	useTheme,
} from "@mui/material";
import {
	forwardRef,
	FocusEvent as ReactFocusEvent,
	KeyboardEvent as ReactKeyboardEvent,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import { useShallow } from "zustand/shallow";
import {
	ALL_COLUMNS,
	COLUMNS,
	computeStatus,
	inputWidthPx,
	VariableColumn,
} from "./variable-selector-utils";
import {
	makeVariableSelectorPaper,
	VariableSelectorOption,
} from "./VariableSelectorPopup";

interface VariableSelectorProps {
	value: string;
	onCommit: (next: string) => void;
	/** Libellé flottant façon `TextField` classique (bordure, label en haut) — non fourni : rendu
	 * compact et épuré (sans bordure), pour une édition inline (ex : nœud Ladder, voir la
	 * documentation du composant). */
	label?: string;
	/** Restreint les suggestions et le statut valide à ces types — non fourni : tous les types. */
	typeFilter?: VariableType[];
	/** Exclut les variables de cette direction des suggestions et du statut valide (ex :
	 * `"IN"` pour une bobine de ladder, voir `LADDER_COIL_VARIABLE_IS_INPUT` dans `coil.analyser.ts`). */
	excludeDirection?: VariableDirection;
	/** Formes de littéral acceptées en plus d'un nom de variable (voir
	 * `BlockPortSpec.acceptedLiterals`) — un littéral d'un genre accepté n'est jamais signalé
	 * comme mnémonique non déclaré. */
	acceptedLiterals?: LiteralKind[];
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
const VariableSelector = forwardRef<
	VariableSelectorHandle,
	VariableSelectorProps
>(function VariableSelector(
	{
		value,
		onCommit,
		label,
		typeFilter,
		excludeDirection,
		acceptedLiterals,
		cols,
		className,
		sx,
		baseInputSx,
	},
	ref,
) {
	const th = useTheme();
	const variables = useProjectStore(
		useShallow((s) => s.project?.variables ?? []),
	);
	const dialect = useProjectStore((s) => s.project?.dialect ?? Dialect.FR);
	const inputRef = useRef<HTMLInputElement>(null);
	const [editingValue, setEditingValue] = useState(value);
	const [widthPx, setWidthPx] = useState(44);

	useImperativeHandle(
		ref,
		() => ({ startEditing: () => inputRef.current?.focus() }),
		[],
	);

	useEffect(() => {
		setEditingValue(value);
	}, [value]);

	// Recalculée après coup (pas en ligne pendant le rendu) : appliquer la nouvelle largeur dans
	// le même commit que la frappe fait parfois manquer le repaint à Chrome (le dernier caractère
	// reste invisible tant qu'on ne déplace pas le curseur) — un cycle de rendu séparé lui laisse
	// le temps de repeindre correctement la zone élargie.
	useEffect(() => {
		setWidthPx(
			inputWidthPx(editingValue, `0.7rem ${th.typography.fontFamily}`),
		);
	}, [editingValue, th.typography.fontFamily]);

	const activeColumns = useMemo(
		() =>
			ALL_COLUMNS.filter((c) => c === "mnemonic" || !cols || cols.includes(c)),
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

	// Saisie en cours non validée : la commiter au démontage. Sans ça, sélectionner un autre
	// widget (qui remonte le panneau de propriétés) sans blurer d'abord validerait la valeur
	// contre le widget suivant via un `onCommit` périmé.
	const flushRef = useRef<() => void>(() => {});
	flushRef.current = () => {
		if (editingValue.trim() !== value) save();
	};
	useEffect(() => () => flushRef.current(), []);

	const status = computeStatus(
		editingValue,
		variables,
		typeFilter,
		excludeDirection,
		acceptedLiterals,
		dialect,
	);
	const statusColor =
		status && status !== "ok" ? th.palette.error.main : undefined;

	return (
		<Autocomplete
			freeSolo
			openOnFocus
			size="small"
			options={suggestions}
			getOptionLabel={(option) =>
				typeof option === "string" ? option : option.mnemonic
			}
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
					style: {
						width:
							activeColumns.reduce((sum, c) => sum + COLUMNS[c].width, 0) + 16,
					},
				},
			}}
			slots={{
				paper: makeVariableSelectorPaper(activeColumns, filteredSuggestions),
			}}
			renderOption={(props, option) => (
				<VariableSelectorOption
					key={(option as Variable).id}
					optionProps={props}
					option={option as Variable}
					activeColumns={activeColumns}
				/>
			)}
			renderInput={(params) => (
				<TextField
					{...params}
					inputRef={inputRef}
					variant={label ? "outlined" : "standard"}
					label={label}
					placeholder={label ? undefined : "?"}
					inputProps={{
						...params.inputProps,
						"data-variable-status": status ?? undefined,
					}}
					// Fusionné à `params.InputProps` (pas remplacé) : il porte la `ref` et le
					// `onMouseDown` dont Autocomplete a besoin pour se positionner et s'ouvrir au
					// clic — un `slotProps.input` à côté les aurait purement et simplement écrasés.
					slotProps={{
						input: label
							? params.InputProps
							: { ...params.InputProps, disableUnderline: true },
						// Label toujours en haut, comme les autres champs du panneau de propriétés — pas
						// seulement au focus/à la saisie (comportement par défaut de `InputLabel`).
						inputLabel: label ? { shrink: true } : undefined,
					}}
					// `params.inputProps` porte les handlers réels d'Autocomplete (ouverture au focus,
					// navigation clavier de la liste, etc.) — les remplacer purement et simplement au
					// niveau du `TextField` les casse. On les rappelle explicitement avant d'ajouter
					// notre propre comportement.
					onBlur={(e) => {
						params.inputProps.onBlur?.(e as ReactFocusEvent<HTMLInputElement>);
						save();
					}}
					onKeyDown={(e) => {
						params.inputProps.onKeyDown?.(
							e as unknown as ReactKeyboardEvent<HTMLInputElement>,
						);
						if (e.key === "Enter" || e.key === "Escape")
							inputRef.current?.blur();
					}}
					sx={[
						{
							// `!important` : `.MuiInputBase-inputSizeSmall` (ajoutée par `size="small"`) a
							// la même spécificité qu'une classe générée par `sx` et gagne parfois
							// l'arbitrage, laissant du padding/un `text-overflow: ellipsis` par défaut qui
							// tronquait le texte au lieu de laisser le champ s'élargir — non pertinent en
							// apparence bordée, qui garde le padding standard d'un `TextField` outlined.
							"& .MuiInputBase-input": label
								? { color: statusColor, cursor: "text", ...(baseInputSx ?? {}) }
								: {
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
						// `inputWidthPx` — le pourquoi d'un calcul plutôt qu'un `auto`). Non pertinent en
						// apparence bordée, où la largeur vient normalement de l'appelant (`sx`).
						...(label ? [] : [{ width: widthPx }]),
					]}
				/>
			)}
		/>
	);
});

export default VariableSelector;
