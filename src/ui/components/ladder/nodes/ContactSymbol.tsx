"use client";

import { ContactType } from "@/schemas/ladder/element.schema";
import { Box } from "@mui/material";

const Letter = ({ letter }: { letter: string }) => {
	return (
		<Box
			sx={{
				position: "absolute",
				left: 0,
				top: "-15%",
				width: "100%",
				height: "100%",
				textAlign: "center",
			}}
		>
			{letter}
		</Box>
	);
};

/**
 * Symbole visuel d'un contact, sans les Handles React Flow ni le label — réutilisé par
 * `ContactNode` (canevas) et `ContactTool` (icône de la toolbar).
 */
const ContactSymbol = ({
	type,
	color = "black",
}: {
	type: ContactType;
	color?: string;
}) => {
	return (
		<Box sx={{ position: "relative", width: "100%", height: "100%" }}>
			<Box
				sx={{
					position: "absolute",
					left: "0%",
					top: "calc(50% - 1px)",
					width: "25%",
					height: "2px",
					background: color,
				}}
			/>
			<Box
				sx={{
					position: "absolute",
					left: "25%",
					top: 0,
					width: "2px",
					height: "100%",
					background: color,
				}}
			/>
			<Box
				sx={{
					position: "absolute",
					right: "25%",
					top: 0,
					width: "2px",
					height: "100%",
					background: color,
				}}
			/>
			<Box
				sx={{
					position: "absolute",
					right: 0,
					top: "calc(50% - 1px)",
					width: "25%",
					height: "2px",
					background: color,
				}}
			/>
			{type === "NF" && (
				<Box
					sx={{
						position: "absolute",
						left: "49%",
						top: "-7%",
						width: "2px",
						height: "113%",
						background: color,
						transform: "rotate(30deg)",
					}}
				/>
			)}
			{type === "P" && <Letter letter="P" />}
			{type === "N" && <Letter letter="N" />}
		</Box>
	);
};

export default ContactSymbol;
