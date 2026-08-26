"use client";

import { HMI_WIDGET_DEFINITIONS, HmiWidgetData, HmiWidgetType } from "@/schemas/hmi/hmi-widget.schema";
import { HmiWidgetTool } from "@/ui/components/hmi/view/constants";
import { HMI_WIDGET_COMPONENTS } from "@/ui/components/hmi/widgets/hmi-widget-components";
import { Box, Tooltip } from "@mui/material";
import { ComponentType } from "react";
import GaugeSymbol from "./GaugeSymbol";
import { useHmiWidgetDnD } from "./HmiWidgetDnDContext";
import NumericInputSymbol from "./NumericInputSymbol";

/** Hauteur commune à tous les aperçus de la toolbar — seule la largeur varie pour rester
 * reconnaissable (ex. bouton rectangulaire, voyant carré), afin que tous les outils s'alignent. */
const PREVIEW_HEIGHT = 24;

/** Largeur d'aperçu par outil — remplaçable par `HmiWidgetTool.previewWidth`. */
const PREVIEW_WIDTH: Record<HmiWidgetType, number> = {
	"push-button": 46,
	indicator: 24,
	"toggle-switch": 40,
	"numeric-display": 50,
	gauge: 60,
	"numeric-input": 50,
	rectangle: 40,
	ellipse: 40,
	text: 50,
};

const TOOL_SYMBOLS: Partial<Record<HmiWidgetType, ComponentType>> = {
	gauge: GaugeSymbol,
	"numeric-input": NumericInputSymbol,
};

/** Données neutres pour l'aperçu figé (aucune interaction) — seul le BP affiche son libellé
 * directement sur le dessin, les autres le masquent via `hideLabel`. */
const PREVIEW_DATA: Record<HmiWidgetType, HmiWidgetData> = {
	"push-button": { variableMnemonic: "", label: "BP" },
	indicator: { variableMnemonic: "", label: "" },
	"toggle-switch": { variableMnemonic: "", label: "" },
	"numeric-display": { variableMnemonic: "", label: "", unit: "", decimalPlaces: 0 },
	gauge: { variableMnemonic: "", label: "", min: 0, max: 100 },
	"numeric-input": { variableMnemonic: "", label: "", min: 0, max: 100 },
	rectangle: { style: { fill: "#e0e0e0", stroke: "#555555", strokeWidth: 2 } },
	ellipse: { style: { fill: "#e0e0e0", stroke: "#555555", strokeWidth: 2 } },
	text: { text: "Texte" },
};

const PREVIEW_VALUE: Record<HmiWidgetType, boolean | number> = {
	"push-button": false,
	indicator: false,
	"toggle-switch": false,
	"numeric-display": 0,
	gauge: 30,
	"numeric-input": 0,
	rectangle: 0,
	ellipse: 0,
	text: 0,
};

interface HmiWidgetToolbarItemProps {
	tool: HmiWidgetTool;
	disabled?: boolean;
}

/**
 * Outil de dépose pour un widget HMI — même geste que `LadderTool` (glisser-déposer une icône
 * vers le canevas), mais porte le glissement via `HmiWidgetDnDContext` plutôt qu'en `DataTransfer`
 * natif : palette et canvas HMI partagent le même contexte React (voir `HmiWidgetDnDProvider`
 * dans `HmiPageView`).
 */
const HmiWidgetToolbarItem = ({ tool, disabled }: HmiWidgetToolbarItemProps) => {
	const { type } = tool;
	const { setDraggedTool } = useHmiWidgetDnD();
	const label = tool.label ?? HMI_WIDGET_DEFINITIONS[type].label;
	const previewWidth = tool.previewWidth ?? PREVIEW_WIDTH[type];
	const SymbolComponent = TOOL_SYMBOLS[type];
	const RealComponent = HMI_WIDGET_COMPONENTS[type];

	return (
		<Tooltip title={label}>
			<Box
				sx={{
					width: previewWidth + 12,
					height: 30,
					cursor: disabled ? "not-allowed" : "grab",
					userSelect: "none",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					opacity: disabled ? 0.4 : 1,
					pointerEvents: disabled ? "none" : undefined,
					"&:hover": {
						background: "rgb(240, 240, 240)",
					},
				}}
				draggable={!disabled}
				onDragStart={(e) => {
					setDraggedTool(tool);
					e.dataTransfer.effectAllowed = "copy";
				}}
				onDragEnd={() => setDraggedTool(null)}
			>
				<Box
					sx={{
						width: previewWidth,
						height: PREVIEW_HEIGHT,
						overflow: "hidden",
						pointerEvents: "none",
					}}
				>
					{SymbolComponent ? (
						<SymbolComponent />
					) : (
						<RealComponent
							data={PREVIEW_DATA[type]}
							value={PREVIEW_VALUE[type]}
							hideLabel={type !== "push-button"}
						/>
					)}
				</Box>
			</Box>
		</Tooltip>
	);
};

export default HmiWidgetToolbarItem;
