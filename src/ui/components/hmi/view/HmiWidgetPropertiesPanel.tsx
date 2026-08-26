"use client";

import {
	HMI_WIDGET_DEFINITIONS,
	HmiGaugeOrientation,
	HmiPushButtonBehavior,
	HmiTextAlign,
	HmiWidget,
	HmiWidgetType,
} from "@/schemas/hmi/hmi-widget.schema";
import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import VariableSelector from "@/ui/components/variables/VariableSelector";
import BoltIcon from "@mui/icons-material/Bolt";
import TuneIcon from "@mui/icons-material/Tune";
import { Box, Button, Checkbox, FormControlLabel, MenuItem, TextField } from "@mui/material";
import { useEffect, useState } from "react";
import { HMI_WIDGET_EVENTS } from "./HmiWidgetEventsPanel";

/** Widgets dont l'interaction en simulation écrit dans la variable liée (voir
 * `HmiWidgetItem`/`HmiCanvas.setVariableValue`) — les autres (indicator, numeric-display, gauge)
 * ne font que la lire. */
const WRITABLE_WIDGET_TYPES = new Set<HmiWidgetType>(["push-button", "toggle-switch", "numeric-input"]);

const PUSH_BUTTON_BEHAVIORS: { value: HmiPushButtonBehavior; label: string }[] = [
	{ value: "momentary", label: "Impulsionnel (maintien momentané)" },
	{ value: "set", label: "SET (mise à 1)" },
	{ value: "reset", label: "RESET (mise à 0)" },
	{ value: "toggle", label: "Bascule (inversion)" },
];

const HmiWidgetPropertiesPanel = ({ widget }: { widget: HmiWidget }) => {
	const updateWidget = useHmiStore((s) => s.updateWidget);
	const openAnimationsPane = useHmiStore((s) => s.openAnimationsPane);
	const openEventsPane = useHmiStore((s) => s.openEventsPane);
	const widgets = useHmiStore((s) => s.hmiPage.widgets);

	const typeFilter = HMI_WIDGET_DEFINITIONS[widget.type].variableTypes;
	// Un widget qui écrit dans la variable liée en simulation (voir `HmiCanvas.setVariableValue`)
	// ne peut pas cibler une sortie : sa valeur est calculée par le programme, pas pilotable.
	const excludeDirection = WRITABLE_WIDGET_TYPES.has(widget.type) ? "OUT" : undefined;

	// Champ local plutôt que directement lié à `widget.name` : un nom vide ou en doublon est
	// silencieusement ignoré par le store (voir `HmiStoreState.updateWidget`), il ne faut donc pas
	// que la frappe en cours soit écrasée à chaque caractère tant qu'elle n'est pas valide.
	const [nameInput, setNameInput] = useState(widget.name);
	useEffect(() => setNameInput(widget.name), [widget.id, widget.name]);

	const nameConflicts = widgets.some((w) => w.id !== widget.id && w.name === nameInput.trim());

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
				sx={{ "& .MuiInputBase-input": { color: nameConflicts ? "error.main" : undefined } }}
			/>
			{/* Une forme (rectangle, ellipse, texte) n'a pas de variable "principale" — voir
			`RectangleData`/`EllipseData`/`TextData`. */}
			{widget.type !== "rectangle" && widget.type !== "ellipse" && widget.type !== "text" && (
				<>
					<TextField
						label="Libellé"
						size="small"
						slotProps={{ inputLabel: { shrink: true } }}
						value={widget.data.label}
						onChange={(e) => updateWidget(widget.id, { data: { ...widget.data, label: e.target.value } })}
					/>
					<VariableSelector
						label="Variable liée"
						value={widget.data.variableMnemonic}
						onCommit={(mnemonic) =>
							updateWidget(widget.id, { data: { ...widget.data, variableMnemonic: mnemonic } })
						}
						typeFilter={typeFilter}
						excludeDirection={excludeDirection}
						cols={["mnemonic", "address", "scope"]}
						sx={{ width: "100% !important" }}
						baseInputSx={{ fontSize: "0.85rem !important" }}
					/>
				</>
			)}

			{widget.type === "push-button" && (
				<TextField
					select
					label="Comportement"
					size="small"
					value={widget.data.behavior ?? "momentary"}
					onChange={(e) =>
						updateWidget(widget.id, {
							data: { ...widget.data, behavior: e.target.value as HmiPushButtonBehavior },
						})
					}
				>
					{PUSH_BUTTON_BEHAVIORS.map((option) => (
						<MenuItem key={option.value} value={option.value}>
							{option.label}
						</MenuItem>
					))}
				</TextField>
			)}

			{widget.type === "gauge" && (
				<TextField
					select
					label="Orientation"
					size="small"
					value={widget.data.style?.orientation ?? "horizontal"}
					// La taille stockée reste toujours exprimée "comme si horizontal" (cohérente avec
					// `HMI_WIDGET_DEFINITIONS.gauge.defaultSize`) : on échange largeur/hauteur au
					// changement d'orientation plutôt que de recalculer les bornes de redimensionnement
					// pour chaque orientation (voir `useHmiWidgetResize`, resté générique).
					onChange={(e) => {
						const orientation = e.target.value as HmiGaugeOrientation;
						updateWidget(widget.id, {
							data: { ...widget.data, style: { ...widget.data.style, orientation } },
							size: { width: widget.size.height, height: widget.size.width },
						});
					}}
				>
					<MenuItem value="horizontal">Horizontal</MenuItem>
					<MenuItem value="vertical">Vertical</MenuItem>
				</TextField>
			)}

			{(widget.type === "gauge" || widget.type === "numeric-input") && (
				<Box sx={{ display: "flex", gap: 1 }}>
					<TextField
						label="Min"
						size="small"
						type="number"
						value={widget.data.min ?? 0}
						onChange={(e) =>
							updateWidget(widget.id, { data: { ...widget.data, min: Number(e.target.value) } })
						}
						sx={{ flex: 1 }}
					/>
					<TextField
						label="Max"
						size="small"
						type="number"
						value={widget.data.max ?? 100}
						onChange={(e) =>
							updateWidget(widget.id, { data: { ...widget.data, max: Number(e.target.value) } })
						}
						sx={{ flex: 1 }}
					/>
				</Box>
			)}

			{widget.type === "numeric-display" && (
				<TextField
					label="Unité"
					size="small"
					slotProps={{ inputLabel: { shrink: true } }}
					value={widget.data.unit ?? ""}
					onChange={(e) => updateWidget(widget.id, { data: { ...widget.data, unit: e.target.value } })}
				/>
			)}

			{widget.type === "numeric-display" && (
				<TextField
					label="Décimales"
					size="small"
					type="number"
					inputProps={{ min: 0, max: 6 }}
					value={widget.data.decimalPlaces ?? 0}
					onChange={(e) =>
						updateWidget(widget.id, {
							data: { ...widget.data, decimalPlaces: Math.max(0, Math.min(6, Number(e.target.value))) },
						})
					}
				/>
			)}

			{(widget.type === "rectangle" || widget.type === "ellipse") && (
				<>
					<Box sx={{ display: "flex", gap: 1 }}>
						<TextField
							label="Remplissage"
							size="small"
							type="color"
							value={widget.data.style.fill}
							onChange={(e) =>
								updateWidget(widget.id, {
									data: { ...widget.data, style: { ...widget.data.style, fill: e.target.value } },
								})
							}
							sx={{ flex: 1 }}
						/>
						<TextField
							label="Contour"
							size="small"
							type="color"
							value={widget.data.style.stroke}
							onChange={(e) =>
								updateWidget(widget.id, {
									data: { ...widget.data, style: { ...widget.data.style, stroke: e.target.value } },
								})
							}
							sx={{ flex: 1 }}
						/>
					</Box>
					<TextField
						label="Épaisseur du contour"
						size="small"
						type="number"
						inputProps={{ min: 0 }}
						value={widget.data.style.strokeWidth ?? 0}
						onChange={(e) =>
							updateWidget(widget.id, {
								data: { ...widget.data, style: { ...widget.data.style, strokeWidth: Math.max(0, Number(e.target.value)) } },
							})
						}
					/>
				</>
			)}

			{widget.type === "rectangle" && (
				<TextField
					label="Rayon des angles"
					size="small"
					type="number"
					inputProps={{ min: 0 }}
					value={widget.data.style.borderRadius ?? 0}
					onChange={(e) =>
						updateWidget(widget.id, {
							data: { ...widget.data, style: { ...widget.data.style, borderRadius: Math.max(0, Number(e.target.value)) } },
						})
					}
				/>
			)}

			{widget.type === "ellipse" && (
				<FormControlLabel
					control={
						<Checkbox
							size="small"
							checked={widget.data.lockAspectRatio ?? false}
							onChange={(e) =>
								updateWidget(widget.id, { data: { ...widget.data, lockAspectRatio: e.target.checked } })
							}
						/>
					}
					label="Cercle (largeur/hauteur identiques)"
				/>
			)}

			{widget.type === "text" && (
				<>
					<TextField
						label="Texte"
						size="small"
						multiline
						minRows={2}
						value={widget.data.text}
						onChange={(e) => updateWidget(widget.id, { data: { ...widget.data, text: e.target.value } })}
					/>
					<Box sx={{ display: "flex", gap: 1 }}>
						<TextField
							label="Taille"
							size="small"
							type="number"
							inputProps={{ min: 1 }}
							value={widget.data.style?.fontSize ?? 14}
							onChange={(e) =>
								updateWidget(widget.id, {
									data: { ...widget.data, style: { ...widget.data.style, fontSize: Math.max(1, Number(e.target.value)) } },
								})
							}
							sx={{ flex: 1 }}
						/>
						<TextField
							label="Couleur"
							size="small"
							type="color"
							value={widget.data.style?.color ?? "#333333"}
							onChange={(e) =>
								updateWidget(widget.id, { data: { ...widget.data, style: { ...widget.data.style, color: e.target.value } } })
							}
							sx={{ flex: 1 }}
						/>
					</Box>
					<TextField
						select
						label="Alignement"
						size="small"
						value={widget.data.style?.align ?? "center"}
						onChange={(e) =>
							updateWidget(widget.id, {
								data: { ...widget.data, style: { ...widget.data.style, align: e.target.value as HmiTextAlign } },
							})
						}
					>
						<MenuItem value="left">Gauche</MenuItem>
						<MenuItem value="center">Centré</MenuItem>
						<MenuItem value="right">Droite</MenuItem>
					</TextField>
				</>
			)}

			<Box sx={{ display: "flex", gap: 1 }}>
				{HMI_WIDGET_EVENTS[widget.type] && (
					<Button size="small" startIcon={<BoltIcon />} onClick={openEventsPane} sx={{ flex: 1 }}>
						Événements
					</Button>
				)}
				<Button size="small" startIcon={<TuneIcon />} onClick={openAnimationsPane} sx={{ flex: 1 }}>
					Animations
				</Button>
			</Box>
		</Box>
	);
};

export default HmiWidgetPropertiesPanel;
