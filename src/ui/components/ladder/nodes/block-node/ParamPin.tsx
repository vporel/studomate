"use client";

import { BlockPortSpec } from "@/schemas/function-blocks/function-block.schema";
import { VARIABLE_TYPE_TO_NATIVE_TYPE, VariableType } from "@/schemas/variable/variable.schema";
import VariableSelector, { VariableSelectorHandle } from "@/ui/components/variables/VariableSelector";
import { Box, Typography } from "@mui/material";
import { Fragment, useRef } from "react";

/** PT/ET (et tout futur paramètre numérique) référencent une variable native "nombre" — TIME
 * est stockée en ms, donc au même titre qu'un entier/réel classique. */
const NUMERIC_VARIABLE_TYPES = (Object.keys(VARIABLE_TYPE_TO_NATIVE_TYPE) as VariableType[]).filter(
	(type) => VARIABLE_TYPE_TO_NATIVE_TYPE[type] === "number",
);

/**
 * Un pin paramètre (entrée ou sortie, voir `ParamPinRow`) : libellé toujours visible à
 * l'intérieur de la boîte, champ (`VariableSelector`, avec autocomplétion et texte libre pour une
 * constante `T#...`) à l'extérieur, du côté du pin (`left` pour une entrée, `right` pour une
 * sortie — l'ordre DOM libellé/champ suit ce côté pour que le champ pousse vers l'extérieur).
 * Un double-clic sur le libellé donne le focus au champ — utile quand il est vide, donc
 * potentiellement peu visible ; un champ déjà rempli reste cliquable directement.
 */
export default function ParamPin({
	side,
	spec,
	value,
	onCommit,
}: {
	side: "left" | "right";
	spec: BlockPortSpec;
	value: string;
	onCommit: (value: string) => void;
}) {
	const selectorRef = useRef<VariableSelectorHandle>(null);

	const label = (
		<Typography
			noWrap
			sx={{ fontSize: 9, cursor: "text", [side === "left" ? "pl" : "pr"]: "2px" }}
			onDoubleClick={(e) => {
				e.stopPropagation();
				selectorRef.current?.startEditing();
			}}
		>
			{spec.suffix}
		</Typography>
	);

	const selector = (
		<VariableSelector
			ref={selectorRef}
			value={value}
			onCommit={onCommit}
			typeFilter={NUMERIC_VARIABLE_TYPES}
			acceptsTimeLiteral={spec.acceptsTimeLiteral}
			className="nodrag"
			sx={{
				position: "absolute",
				top: "7px",
				height: "100%",
				[side === "left" ? "right" : "left"]: "100%",
			}}
			baseInputSx={{
				textAlign: side === "left" ? "right" : "left",
				[side === "left" ? "mr" : "ml"]: "3px",
			}}
		/>
	);

	return (
		<Box>
			{side === "left" ? (
				<Fragment>
					{selector}
					{label}
				</Fragment>
			) : (
				<Fragment>
					{label}
					{selector}
				</Fragment>
			)}
		</Box>
	);
}
