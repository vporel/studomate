"use client";

import Variable from "@/schemas/variable/variable.schema";
import { Box, Paper, PaperProps } from "@mui/material";
import { useTheme } from "@mui/material";
import { cellValue, COLUMNS, columnsGridTemplate, VariableColumn } from "./variable-selector-utils";

/**
 * Paper personnalisé injecté dans l'Autocomplete : ajoute une ligne d'en-tête de colonnes
 * au-dessus des suggestions. Rendu nul quand la liste est vide pour éviter d'afficher
 * un bloc vide (juste l'en-tête) pendant la saisie d'une constante libre (ex. `T#5s`).
 */
export function makeVariableSelectorPaper(activeColumns: VariableColumn[], filteredSuggestions: Variable[]) {
	if (filteredSuggestions.length === 0) return () => null;

	const gridTemplateColumns = columnsGridTemplate(activeColumns);

	return function VariableSelectorPaper({ children, ...paperProps }: PaperProps) {
		const th = useTheme();
		return (
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
		);
	};
}

interface VariableSelectorOptionProps {
	optionProps: React.HTMLAttributes<HTMLLIElement> & { key?: React.Key };
	option: Variable;
	activeColumns: VariableColumn[];
}

/** Rendu d'une option individuelle dans la liste de suggestions. */
export const VariableSelectorOption = ({ optionProps, option, activeColumns }: VariableSelectorOptionProps) => {
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
