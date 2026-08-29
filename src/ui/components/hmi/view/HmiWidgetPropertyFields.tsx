"use client";

import { HmiWidget, HmiWidgetData } from "@/schemas/hmi/hmi-widget.schema";
import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import {
	HMI_WIDGET_UI,
	HmiWidgetPropertyField,
} from "@/ui/components/hmi/widgets/hmi-widget-ui";
import {
	Checkbox,
	FormControlLabel,
	MenuItem,
	TextField,
} from "@mui/material";

/** Rend les champs spécifiques au type du widget dans le panneau Propriétés, à partir des
 * descripteurs déclaratifs de `HMI_WIDGET_UI[type].propertyFields` — le câblage vers `data` passe
 * par les `get`/`set` typés du descripteur. Les champs communs (Nom, Libellé, Variable liée) restent
 * dans `HmiWidgetPropertiesPanel`. */
const HmiWidgetPropertyFields = ({ widget }: { widget: HmiWidget }) => {
	const updateWidget = useHmiStore((s) => s.updateWidget);
	const fields = HMI_WIDGET_UI[widget.type]
		.propertyFields as HmiWidgetPropertyField<HmiWidgetData>[];

	const apply = (
		data: HmiWidgetData,
		extra?: { size?: { width: number; height: number } },
	) =>
		updateWidget(widget.id, {
			data: data as Partial<HmiWidgetData>,
			...extra,
		});

	return (
		<>
			{fields.map((field) => {
				const key = field.label;

				if (field.kind === "checkbox") {
					return (
						<FormControlLabel
							key={key}
							control={
								<Checkbox
									size="small"
									checked={field.get(widget.data)}
									onChange={(e) =>
										apply(field.set(widget.data, e.target.checked))
									}
								/>
							}
							label={field.label}
						/>
					);
				}

				if (field.kind === "select") {
					return (
						<TextField
							key={key}
							select
							label={field.label}
							size="small"
							value={field.get(widget.data)}
							onChange={(e) =>
								apply(
									field.set(widget.data, e.target.value),
									field.widgetPatch?.(widget, e.target.value),
								)
							}
						>
							{field.options.map((option) => (
								<MenuItem key={option.value} value={option.value}>
									{option.label}
								</MenuItem>
							))}
						</TextField>
					);
				}

				if (field.kind === "number") {
					const { min, max } = field;
					return (
						<TextField
							key={key}
							label={field.label}
							size="small"
							type="number"
							inputProps={{ min, max }}
							value={field.get(widget.data)}
							onChange={(e) => {
								let next = Number(e.target.value);
								if (min !== undefined) next = Math.max(min, next);
								if (max !== undefined) next = Math.min(max, next);
								apply(field.set(widget.data, next));
							}}
						/>
					);
				}

				// "text" | "color"
				return (
					<TextField
						key={key}
						label={field.label}
						size="small"
						type={field.kind === "color" ? "color" : undefined}
						multiline={field.kind === "text" && field.multiline}
						minRows={field.kind === "text" && field.multiline ? 2 : undefined}
						slotProps={
							field.kind === "text"
								? { inputLabel: { shrink: true } }
								: undefined
						}
						value={field.get(widget.data)}
						onChange={(e) => apply(field.set(widget.data, e.target.value))}
					/>
				);
			})}
		</>
	);
};

export default HmiWidgetPropertyFields;
