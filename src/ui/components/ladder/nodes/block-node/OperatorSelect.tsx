"use client";

import { MenuItem, Select } from "@mui/material";

/**
 * Select d'un opérateur de bloc (comparaison d'un `compare`, arithmétique d'un `arithmetic`) —
 * menu au clic, flèche masquée pour ne montrer que le symbole. `className="nodrag"` et l'arrêt de
 * propagation du `mousedown` empêchent React Flow de démarrer un déplacement du nœud à
 * l'ouverture.
 */
export default function OperatorSelect<T extends string>({
	value,
	onChange,
	operators,
	ariaLabel,
	fontSize = 14,
	menuFontSize = fontSize,
}: {
	value: T;
	onChange: (operator: T) => void;
	operators: readonly T[];
	ariaLabel: string;
	fontSize?: number;
	menuFontSize?: number;
}) {
	return (
		<Select
			className="nodrag"
			value={value}
			onChange={(e) => onChange(e.target.value as T)}
			onMouseDown={(e) => e.stopPropagation()}
			size="small"
			variant="standard"
			disableUnderline
			inputProps={{ "aria-label": ariaLabel }}
			sx={{
				fontSize,
				backgroundColor: "grey.200",
				borderRadius: "2px",
				lineHeight: 1,
				"& .MuiSelect-icon": { display: "none" },
				"& .MuiSelect-select": {
					p: "0 2px !important",
					minHeight: "0 !important",
					textAlign: "center",
				},
			}}
		>
			{operators.map((operator) => (
				<MenuItem
					key={operator}
					value={operator}
					sx={{ fontSize: menuFontSize, minHeight: 0, py: "3px" }}
				>
					{operator}
				</MenuItem>
			))}
		</Select>
	);
}
