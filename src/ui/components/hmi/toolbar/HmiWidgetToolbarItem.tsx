"use client";

import { HMI_WIDGET_DEFINITIONS } from "@/schemas/hmi/hmi-widget.schema";
import { HmiWidgetTool } from "@/ui/components/hmi/view/constants";
import { HMI_WIDGET_UI } from "@/ui/components/hmi/widgets/hmi-widget-ui";
import { Box, Tooltip } from "@mui/material";
import { useHmiWidgetDnD } from "./HmiWidgetDnDContext";

/** Hauteur commune à tous les aperçus de la toolbar — seule la largeur varie pour rester
 * reconnaissable (ex. bouton rectangulaire, voyant carré), afin que tous les outils s'alignent. */
const PREVIEW_HEIGHT = 24;

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
const HmiWidgetToolbarItem = ({
	tool,
	disabled,
}: HmiWidgetToolbarItemProps) => {
	const { type } = tool;
	const { setDraggedTool } = useHmiWidgetDnD();
	const ui = HMI_WIDGET_UI[type];
	const label = tool.label ?? HMI_WIDGET_DEFINITIONS[type].label;
	const previewWidth = tool.previewWidth ?? ui.previewWidth;
	const SymbolComponent = ui.toolSymbol;
	const RealComponent = ui.component;

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
							data={HMI_WIDGET_DEFINITIONS[type].defaultData}
							value={ui.previewValue}
							hideLabel={type !== "push-button"}
						/>
					)}
				</Box>
			</Box>
		</Tooltip>
	);
};

export default HmiWidgetToolbarItem;
