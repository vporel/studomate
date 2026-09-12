"use client";

import Variable from "@/schemas/variable/variable.schema";
import { Box, Paper, PaperProps } from "@mui/material";
import { useTheme } from "@mui/material";
import { createContext, useContext } from "react";
import {
	cellValue,
	COLUMNS,
	columnsGridTemplate,
	VariableColumn,
} from "./variable-selector-utils";

interface VariableSelectorPaperContextValue {
	activeColumns: VariableColumn[];
	/** Liste de suggestions vide : le Paper ne se rend pas du tout (voir `VariableSelectorPaper`). */
	isEmpty: boolean;
}

/** Alimente le slot `paper` de l'Autocomplete depuis `VariableSelector` sans en refabriquer le
 * type de composant à chaque frappe (ce qui démonterait/remonterait toute la liste). */
export const VariableSelectorPaperContext =
	createContext<VariableSelectorPaperContextValue>({
		activeColumns: [],
		isEmpty: false,
	});

/**
 * Paper personnalisé injecté dans l'Autocomplete : ajoute une ligne d'en-tête de colonnes
 * au-dessus des suggestions. Rendu nul quand la liste est vide pour éviter d'afficher
 * un bloc vide (juste l'en-tête) pendant la saisie d'une constante libre (ex. `T#5s`).
 *
 * Composant stable au niveau module : ses données variables (`activeColumns`, liste vide ou non)
 * viennent du contexte, pas de props, pour que son identité ne change jamais entre deux frappes.
 */
export function VariableSelectorPaper({ children, ...paperProps }: PaperProps) {
	const th = useTheme();
	const { activeColumns, isEmpty } = useContext(VariableSelectorPaperContext);
	if (isEmpty) return null;
	return (
		<Paper {...paperProps}>
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: columnsGridTemplate(activeColumns),
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
	);
}

interface VariableSelectorOptionProps {
	optionProps: React.HTMLAttributes<HTMLLIElement> & { key?: React.Key };
	option: Variable;
	activeColumns: VariableColumn[];
}

/** Rendu d'une option individuelle dans la liste de suggestions. */
export const VariableSelectorOption = ({
	optionProps,
	option,
	activeColumns,
}: VariableSelectorOptionProps) => {
	const gridTemplateColumns = columnsGridTemplate(activeColumns);
	const { key, style, ...rest } = optionProps;
	return (
		<li key={key} {...rest} style={{ ...style, padding: 0 }}>
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
};
