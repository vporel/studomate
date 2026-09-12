"use client";

import { ParameterPinRow } from "@/schemas/ladder/block-port.schema";
import { Box } from "@mui/material";
import ParamPin from "./ParamPin";
import { PIN_ROW_HEIGHT } from "./dimensions";

/**
 * Une ligne de pins paramètres (voir `getParameterPinRows`) — générique à toute famille de bloc :
 * ne connaît ni `PT`/`ET` ni le timer, seulement les `BlockPortSpec` de la ligne et comment lire/
 * écrire leur valeur (voir `ParamPin` pour le rendu d'un pin).
 */
export default function ParamPinRow({
	top,
	row,
	getValue,
	onCommit,
}: {
	top: number;
	row: ParameterPinRow;
	getValue: (suffix: string) => string;
	onCommit: (suffix: string, value: string) => void;
}) {
	return (
		<Box
			sx={{
				position: "absolute",
				top,
				left: 0,
				right: 0,
				height: PIN_ROW_HEIGHT,
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				px: "2px",
			}}
		>
			{row.input ? (
				<ParamPin
					side="left"
					spec={row.input}
					value={getValue(row.input.suffix)}
					onCommit={(next) => onCommit(row.input!.suffix, next)}
				/>
			) : (
				<span />
			)}
			{row.output ? (
				<ParamPin
					side="right"
					spec={row.output}
					value={getValue(row.output.suffix)}
					onCommit={(next) => onCommit(row.output!.suffix, next)}
				/>
			) : (
				<span />
			)}
		</Box>
	);
}
