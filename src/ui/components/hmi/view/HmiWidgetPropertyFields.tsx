"use client";

import { HmiWidget, HmiWidgetData } from "@/schemas/hmi/hmi-widget.schema";
import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import {
	HMI_WIDGET_UI,
	HmiWidgetPropertyField,
} from "@/ui/components/hmi/widgets/hmi-widget-ui";
import useCommittedField from "@/ui/lib/hooks/useCommittedField";
import {
	Box,
	Checkbox,
	FormControlLabel,
	MenuItem,
	TextField,
} from "@mui/material";
import { ReactNode } from "react";

type PropertyField = HmiWidgetPropertyField<HmiWidgetData>;
type NumberField = Extract<PropertyField, { kind: "number" }>;
type TextFieldSpec = Extract<PropertyField, { kind: "text" }>;

/** Regroupe deux champs couleur qui se suivent (Remplissage/Contour, Couleur allumé/éteint) pour
 * les poser sur une même ligne ; tout autre champ reste seul, dans l'ordre des descripteurs. */
export function groupPropertyFields<D>(
	fields: HmiWidgetPropertyField<D>[],
): (
	| HmiWidgetPropertyField<D>
	| [HmiWidgetPropertyField<D>, HmiWidgetPropertyField<D>]
)[] {
	const groups: (
		| HmiWidgetPropertyField<D>
		| [HmiWidgetPropertyField<D>, HmiWidgetPropertyField<D>]
	)[] = [];
	for (let i = 0; i < fields.length; i++) {
		const field = fields[i];
		const next = fields[i + 1];
		if (field.kind === "color" && next?.kind === "color") {
			groups.push([field, next]);
			i++;
		} else {
			groups.push(field);
		}
	}
	return groups;
}

/** Rend les champs spécifiques au type du widget dans le panneau Propriétés, à partir des
 * descripteurs déclaratifs de `HMI_WIDGET_UI[type].propertyFields` — le câblage vers `data` passe
 * par les `get`/`set` typés du descripteur. Les champs communs (Nom, Libellé, Variable liée) restent
 * dans `HmiWidgetPropertiesPanel`. */
const HmiWidgetPropertyFields = ({ widget }: { widget: HmiWidget }) => {
	const updateWidget = useHmiStore((s) => s.updateWidget);
	const fields = HMI_WIDGET_UI[widget.type].propertyFields as PropertyField[];

	const apply = (
		data: HmiWidgetData,
		extra?: { size?: { width: number; height: number } },
	) =>
		updateWidget(widget.id, {
			data: data as Partial<HmiWidgetData>,
			...extra,
		});

	const renderField = (field: PropertyField): ReactNode => {
		if (field.kind === "checkbox") {
			return (
				<FormControlLabel
					control={
						<Checkbox
							size="small"
							checked={field.get(widget.data)}
							onChange={(e) => apply(field.set(widget.data, e.target.checked))}
						/>
					}
					label={field.label}
					sx={{ "& .MuiFormControlLabel-label": { fontSize: 12 } }}
				/>
			);
		}

		if (field.kind === "select") {
			return (
				<TextField
					select
					fullWidth
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
			return (
				<NumberPropertyField field={field} widget={widget} apply={apply} />
			);
		}

		if (field.kind === "color") {
			return (
				<TextField
					label={field.label}
					size="small"
					fullWidth
					type="color"
					value={field.get(widget.data)}
					onChange={(e) => apply(field.set(widget.data, e.target.value))}
				/>
			);
		}

		return <TextPropertyField field={field} widget={widget} apply={apply} />;
	};

	return (
		<>
			{groupPropertyFields(fields).map((group) =>
				Array.isArray(group) ? (
					<Box key={group[0].label} sx={{ display: "flex", gap: 1 }}>
						<Box sx={{ flex: 1, minWidth: 0 }}>{renderField(group[0])}</Box>
						<Box sx={{ flex: 1, minWidth: 0 }}>{renderField(group[1])}</Box>
					</Box>
				) : (
					<Box key={group.label}>{renderField(group)}</Box>
				),
			)}
		</>
	);
};

/** Champ numérique à validation différée : la frappe reste locale, la commande n'est enregistrée
 * qu'au blur ou sur Entrée (voir `useCommittedField`). */
const NumberPropertyField = ({
	field,
	widget,
	apply,
}: {
	field: NumberField;
	widget: HmiWidget;
	apply: (data: HmiWidgetData) => void;
}) => {
	const committed = useCommittedField<number>({
		value: field.get(widget.data),
		parse: (text) => {
			if (text.trim() === "" || Number.isNaN(Number(text))) return null;
			let n = Number(text);
			if (field.min !== undefined) n = Math.max(field.min, n);
			if (field.max !== undefined) n = Math.min(field.max, n);
			return n;
		},
		onCommit: (value) => apply(field.set(widget.data, value)),
	});

	return (
		<TextField
			label={field.label}
			size="small"
			type="number"
			fullWidth
			slotProps={{
				htmlInput: {
					min: field.min,
					max: field.max,
					onKeyDown: committed.onKeyDown,
				},
			}}
			value={committed.value}
			onChange={committed.onChange}
			onBlur={committed.onBlur}
		/>
	);
};

/** Champ texte à validation différée. En multiligne, Entrée insère un retour à la ligne (pas de
 * blur) : la validation ne se fait alors qu'au blur. */
const TextPropertyField = ({
	field,
	widget,
	apply,
}: {
	field: TextFieldSpec;
	widget: HmiWidget;
	apply: (data: HmiWidgetData) => void;
}) => {
	const multiline = !!field.multiline;
	const committed = useCommittedField<string>({
		value: field.get(widget.data),
		onCommit: (value) => apply(field.set(widget.data, value)),
	});

	return (
		<TextField
			label={field.label}
			size="small"
			fullWidth
			multiline={multiline}
			minRows={multiline ? 2 : undefined}
			slotProps={{
				inputLabel: { shrink: true },
				htmlInput: {
					onKeyDown: multiline ? undefined : committed.onKeyDown,
				},
			}}
			value={committed.value}
			onChange={committed.onChange}
			onBlur={committed.onBlur}
		/>
	);
};

export default HmiWidgetPropertyFields;
