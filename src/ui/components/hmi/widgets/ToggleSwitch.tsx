"use client";

import {
	DEFAULT_SWITCH_CONTACT,
	ToggleSwitchData,
} from "@/schemas/hmi/hmi-widget.schema";
import { Box } from "@mui/material";
import { HmiWidgetComponentProps } from "./hmi-widget-component";
import widgetBorder from "./widget-border";
import HmiWidgetFrame from "./HmiWidgetFrame";

const ToggleSwitch = ({
	data,
	value,
	selected,
	hideLabel,
	onClick,
	onValueChange,
}: HmiWidgetComponentProps<ToggleSwitchData>) => {
	const normallyClosed = (data.contact ?? DEFAULT_SWITCH_CONTACT) === "nc";
	// `active` is the actuated position: for a normally closed contact, it writes `false`. An
	// unknown value (outside simulation) shows the rest position.
	const active =
		value !== undefined && (normallyClosed ? !value : Boolean(value));

	return (
		// `size` ne dimensionne que la piste (le dessin) : le libellé est positionné en absolu
		// sous le widget pour ne jamais l'empiéter, quelle que soit sa taille.
		<HmiWidgetFrame
			label={data.label}
			hideLabel={hideLabel}
			cursor={onValueChange || onClick ? "pointer" : "default"}
			onClick={() => (onValueChange ? onValueChange(!value) : onClick?.())}
		>
			{/* Piste — le curseur suit `justifyContent` plutôt qu'un `left` en px, pour rester
			cohérent quelle que soit la taille du widget (redimensionnable). */}
			<Box
				sx={{
					width: "100%",
					height: "100%",
					display: "flex",
					alignItems: "center",
					justifyContent: active ? "flex-end" : "flex-start",
					padding: "2px",
					borderRadius: 999,
					border: widgetBorder(selected),
					backgroundColor: active ? "#1976d2" : "#bdbdbd",
					transition: "background-color 0.15s",
				}}
			>
				<Box
					sx={{
						height: "100%",
						aspectRatio: "1",
						borderRadius: "50%",
						backgroundColor: "white",
						boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
					}}
				/>
			</Box>
		</HmiWidgetFrame>
	);
};

export default ToggleSwitch;
