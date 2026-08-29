"use client";

import {
	HMI_WIDGET_DEFINITIONS,
	HmiWidget,
} from "@/schemas/hmi/hmi-widget.schema";
import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import { HMI_WIDGET_UI } from "@/ui/components/hmi/widgets/hmi-widget-ui";
import VariableSelector from "@/ui/components/variables/VariableSelector";
import BoltIcon from "@mui/icons-material/Bolt";
import TuneIcon from "@mui/icons-material/Tune";
import { Box, Button, TextField } from "@mui/material";
import { useEffect, useState } from "react";
import HmiWidgetPropertyFields from "./HmiWidgetPropertyFields";

const HmiWidgetPropertiesPanel = ({ widget }: { widget: HmiWidget }) => {
	const updateWidget = useHmiStore((s) => s.updateWidget);
	const openAnimationsPane = useHmiStore((s) => s.openAnimationsPane);
	const openEventsPane = useHmiStore((s) => s.openEventsPane);
	const widgets = useHmiStore((s) => s.hmiPage.widgets);

	const variableBinding = HMI_WIDGET_DEFINITIONS[widget.type].variableBinding;
	// Un widget qui écrit dans la variable liée en simulation (voir `HmiCanvas.setVariableValue`)
	// ne peut pas cibler une sortie : sa valeur est calculée par le programme, pas pilotable.
	const excludeDirection = variableBinding?.writes ? "OUT" : undefined;

	// Champ local plutôt que directement lié à `widget.name` : un nom vide ou en doublon est
	// silencieusement ignoré par le store (voir `HmiStoreState.updateWidget`), il ne faut donc pas
	// que la frappe en cours soit écrasée à chaque caractère tant qu'elle n'est pas valide.
	const [nameInput, setNameInput] = useState(widget.name);
	useEffect(() => setNameInput(widget.name), [widget.id, widget.name]);

	const nameConflicts = Object.values(widgets).some(
		(w) => w.id !== widget.id && w.name === nameInput.trim(),
	);

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 1.5 }}>
			<TextField
				label="Nom"
				size="small"
				slotProps={{ inputLabel: { shrink: true } }}
				value={nameInput}
				onChange={(e) => setNameInput(e.target.value)}
				onBlur={() => {
					// Un doublon dans lequel l'utilisateur persiste jusqu'au blur n'est pas rattrapable :
					// on revient au nom de départ plutôt que de laisser le champ afficher une valeur que
					// le store a silencieusement ignorée (voir `HmiStoreState.updateWidget`).
					if (nameConflicts) {
						setNameInput(widget.name);
						return;
					}
					updateWidget(widget.id, { name: nameInput });
				}}
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
						label="Libellé"
						size="small"
						slotProps={{ inputLabel: { shrink: true } }}
						value={widget.data.label}
						onChange={(e) =>
							updateWidget(widget.id, {
								data: { ...widget.data, label: e.target.value },
							})
						}
					/>
					<VariableSelector
						label="Variable liée"
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
