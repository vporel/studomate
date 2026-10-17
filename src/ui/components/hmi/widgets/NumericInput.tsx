"use client";

import { clamp } from "@/lib/number";
import { NumericInputData } from "@/schemas/hmi/hmi-widget.schema";
import { Box } from "@mui/material";
import {
	ChangeEvent,
	FocusEvent,
	KeyboardEvent,
	useEffect,
	useState,
} from "react";
import { HmiWidgetComponentProps } from "./hmi-widget-component";
import widgetBorder from "./widget-border";
import HmiWidgetFrame from "./HmiWidgetFrame";

const NumericInput = ({
	data,
	value,
	selected,
	hideLabel,
	onClick,
	onValueChange,
}: HmiWidgetComponentProps<NumericInputData>) => {
	const numValue = typeof value === "number" ? value : 0;
	const min = data.min ?? 0;
	const max = data.max ?? 100;

	const [text, setText] = useState(String(numValue));

	useEffect(() => {
		setText(String(numValue));
	}, [numValue]);

	const commit = (
		e: FocusEvent<HTMLInputElement> | KeyboardEvent<HTMLInputElement>,
	) => {
		const parsed = Number(e.currentTarget.value);
		const next = Number.isFinite(parsed) ? clamp(parsed, min, max) : numValue;
		setText(String(next));
		onValueChange?.(next);
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") e.currentTarget.blur();
	};

	return (
		<HmiWidgetFrame label={data.label} hideLabel={hideLabel} onClick={onClick}>
			<Box
				component="input"
				type="number"
				value={text}
				min={min}
				max={max}
				disabled={!onValueChange}
				onChange={(e: ChangeEvent<HTMLInputElement>) => setText(e.target.value)}
				onBlur={commit}
				onKeyDown={handleKeyDown}
				sx={{
					width: "100%",
					height: "100%",
					border: widgetBorder(selected),
					borderRadius: 1,
					backgroundColor: "#fff",
					fontFamily: "inherit",
					fontSize: "1rem",
					fontWeight: 700,
					color: "#333",
					textAlign: "center",
					outline: "none",
					// Widget cliquable en mode design (sélection) même une fois le champ désactivé —
					// un `<input disabled>` ne redispatche jamais l'événement `click` à son parent.
					pointerEvents: onValueChange ? "auto" : "none",
					"&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": {
						WebkitAppearance: "none",
						margin: 0,
					},
					"&[type=number]": {
						MozAppearance: "textfield",
					},
				}}
			/>
		</HmiWidgetFrame>
	);
};

export default NumericInput;
