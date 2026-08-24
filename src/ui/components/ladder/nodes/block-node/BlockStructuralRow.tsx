"use client";

import { Box, Theme, Typography } from "@mui/material";
import { PIN_ROW_HEIGHT } from "./dimensions";

/**
 * La ligne structurelle d'un bloc — toujours présente, toujours la première (voir
 * `getBlockPinRowCount`) : le nom du bloc/programme référencé, et ses ports câblés sur le rail
 * (`EN`/`ENO` pour un appel de programme, `IN`/`Q` pour un timer).
 */
export default function BlockStructuralRow({
	label,
	inputLabel,
	outputLabel,
	selected,
	th,
}: {
	label: string;
	inputLabel: string;
	outputLabel: string;
	selected: boolean;
	th: Theme;
}) {
	return (
		<Box
			sx={{
				position: "absolute",
				top: 0,
				left: 0,
				right: 0,
				height: PIN_ROW_HEIGHT,
				display: "flex",
				flexDirection: "column",
				justifyContent: "center",
			}}
		>
			<Typography
				noWrap
				sx={{
					position: "absolute",
					top: "-3px",
					left: "10%",
					width: "80%",
					fontSize: 9,
					textAlign: "center",
					lineHeight: 1.2,
					mx: "auto",
					background: "white",
					px: "2px",
				}}
			>
				{label}
			</Typography>
			<Box sx={{ display: "flex", justifyContent: "space-between", fontSize: 9, px: "4px" }}>
				<span>{inputLabel}</span>
				<span>{outputLabel}</span>
			</Box>
		</Box>
	);
}
