"use client";

import {
	HMI_WIDGET_DEFINITIONS,
	HmiWidget,
} from "@/schemas/hmi/hmi-widget.schema";
import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import { HMI_WIDGET_UI } from "@/ui/components/hmi/widgets/hmi-widget-ui";
import useCommittedField from "@/ui/lib/hooks/useCommittedField";
import VariableSelector from "@/ui/components/variables/VariableSelector";
import BoltIcon from "@mui/icons-material/Bolt";
import TuneIcon from "@mui/icons-material/Tune";
import { Box, Button, TextField } from "@mui/material";
import HmiWidgetGeometryFields from "./HmiWidgetGeometryFields";
import HmiWidgetPropertyFields from "./HmiWidgetPropertyFields";
import { HmiWidgetRect } from "./useHmiWidgetResize";
import { useT } from "@/ui/i18n/useT";

const HmiWidgetPropertiesPanel = ({
	widget,
	onGeometryPreview,
}: {
	widget: HmiWidget;
	/** Aperçu visuel live pendant la saisie dans les sections Position / Dimensions (voir
	 * `HmiCanvas`, même canal que les poignées de redimensionnement). */
	onGeometryPreview: (rect: HmiWidgetRect | null) => void;
}) => {
	const updateWidget = useHmiStore((s) => s.updateWidget);
	const t = useT("hmiEditor.panel");
	const openAnimationsPane = useHmiStore((s) => s.openAnimationsPane);
	const openEventsPane = useHmiStore((s) => s.openEventsPane);
	const widgets = useHmiStore((s) => s.hmiPage.widgets);

	const variableBinding = HMI_WIDGET_DEFINITIONS[widget.type].variableBinding;
	// Un widget qui écrit dans la variable liée en simulation (voir `HmiCanvas.setVariableValue`)
	// ne peut pas cibler une sortie : sa valeur est calculée par le programme, pas pilotable.
	const excludeDirection = variableBinding?.writes ? "OUT" : undefined;

	// Un nom vide ou en doublon est silencieusement ignoré par le store (voir
	// `HmiStoreState.updateWidget`) : on le refuse au blur pour ne pas laisser le champ afficher une
	// valeur que le store n'a pas retenue.
	const nameIsTaken = (name: string) =>
		Object.values(widgets).some(
			(w) => w.id !== widget.id && w.name === name.trim(),
		);
	const nameField = useCommittedField({
		value: widget.name,
		onCommit: (name) => updateWidget(widget.id, { name }),
		reject: (name) => name.trim() === "" || nameIsTaken(name),
	});
	const nameConflicts = nameIsTaken(nameField.value);

	const labelField = useCommittedField({
		value: "label" in widget.data ? widget.data.label : "",
		onCommit: (label) => {
			if ("label" in widget.data)
				updateWidget(widget.id, { data: { ...widget.data, label } });
		},
	});

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 1.5 }}>
			<TextField
				label={t("name")}
				size="small"
				slotProps={{
					inputLabel: { shrink: true },
					htmlInput: { onKeyDown: nameField.onKeyDown },
				}}
				value={nameField.value}
				onChange={nameField.onChange}
				onBlur={nameField.onBlur}
				sx={{
					"& .MuiInputBase-input": {
						color: nameConflicts ? "error.main" : undefined,
					},
				}}
			/>
			{/* Une forme (rectangle, ellipse, texte) n'a pas de variable "principale" — voir
			`RectangleData`/`EllipseData`/`TextData`. Le `in` rétrécit l'union `widget.data`
			(même idiome que `HmiWidgetItem`). */}
			{"variable" in widget.data && variableBinding && (
				<>
					<TextField
						label={t("label")}
						size="small"
						slotProps={{
							inputLabel: { shrink: true },
							htmlInput: { onKeyDown: labelField.onKeyDown },
						}}
						value={labelField.value}
						onChange={labelField.onChange}
						onBlur={labelField.onBlur}
					/>
					<VariableSelector
						label={t("boundVariable")}
						value={widget.data.variable}
						onCommit={(mnemonic) =>
							updateWidget(widget.id, {
								data: { ...widget.data, variable: mnemonic },
							})
						}
						typeFilter={variableBinding.types}
						excludeDirection={excludeDirection}
						cols={["mnemonic", "address", "scope"]}
						sx={{ width: "100% !important" }}
						baseInputSx={{ fontSize: "0.85rem !important" }}
					/>
				</>
			)}

			<HmiWidgetPropertyFields widget={widget} />

			<HmiWidgetGeometryFields widget={widget} onPreview={onGeometryPreview} />

			<Box sx={{ display: "flex", gap: 1 }}>
				{HMI_WIDGET_UI[widget.type].events.length > 0 && (
					<Button
						size="small"
						startIcon={<BoltIcon />}
						onClick={openEventsPane}
						sx={{ flex: 1 }}
					>
						Événements
					</Button>
				)}
				<Button
					size="small"
					startIcon={<TuneIcon />}
					onClick={openAnimationsPane}
					sx={{ flex: 1 }}
				>
					Animations
				</Button>
			</Box>
		</Box>
	);
};

export default HmiWidgetPropertiesPanel;
