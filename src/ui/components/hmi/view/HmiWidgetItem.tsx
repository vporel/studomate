"use client";

import { HmiWidget, HmiWidgetSize } from "@/schemas/hmi/hmi-widget.schema";
import { HMI_WIDGET_COMPONENTS } from "@/ui/components/hmi/widgets/hmi-widget-components";
import { Box } from "@mui/material";
import { MouseEvent as ReactMouseEvent } from "react";
import { HMI_WIDGET_ZINDEX_OFFSET } from "./constants";

const RESIZE_HANDLE_SIZE = 10;

interface HmiWidgetItemProps {
	widget: HmiWidget;
	isSelected: boolean;
	isSimulation: boolean;
	/** N'affiche la poignée que pour une sélection d'un seul widget — pas de redimensionnement
	 * de groupe. */
	showResizeHandle: boolean;
	/** Valeur brute de la variable liée, déjà résolue par `HmiCanvas` (booléenne ou numérique
	 * selon le type PLC). */
	value: boolean | number;
	/** Décalage visuel pendant un glisser en cours (voir `useHmiWidgetDrag`) — ne touche pas
	 * `widget.position`, qui ne change qu'au relâchement. */
	previewOffset?: { dx: number; dy: number };
	/** Taille visuelle pendant un redimensionnement en cours (voir `useHmiWidgetResize`). */
	previewSize?: HmiWidgetSize;
	/** Décalage courant de l'animation de position en simulation (voir `HmiPositionAnimation`) —
	 * s'ajoute à `previewOffset`, qui ne s'applique lui qu'en conception. */
	animationOffset?: { dx: number; dy: number };
	onSetVariableValue: (mnemonic: string, value: boolean | number) => void;
	onTriggerEvent: (widgetId: string, eventName: string) => void;
	onDragStart: (e: ReactMouseEvent) => void;
	onResizeStart: (e: ReactMouseEvent) => void;
	onContextMenu: (e: ReactMouseEvent) => void;
}

/** Un widget posé sur le canvas : son wrapper positionné (drag, sélection), son rendu — délégué
 * au composant associé à `widget.type` via `HMI_WIDGET_COMPONENTS` — et sa poignée de
 * redimensionnement quand il est seul sélectionné. */
const HmiWidgetItem = ({
	widget,
	isSelected,
	isSimulation,
	showResizeHandle,
	value,
	previewOffset,
	previewSize,
	animationOffset,
	onSetVariableValue,
	onTriggerEvent,
	onDragStart,
	onResizeStart,
	onContextMenu,
}: HmiWidgetItemProps) => {
	const Component = HMI_WIDGET_COMPONENTS[widget.type];
	const size = previewSize ?? widget.size;
	// Une forme (rectangle, ellipse, texte) n'a pas de variable "principale" à écrire en
	// simulation — voir `RectangleData`/`EllipseData`/`TextData`.
	const boundMnemonic = "variableMnemonic" in widget.data ? widget.data.variableMnemonic : null;

	return (
		<Box
			onMouseDown={onDragStart}
			onClick={(e) => e.stopPropagation()}
			onContextMenu={onContextMenu}
			sx={{
				position: "absolute",
				left: widget.position.x + (previewOffset?.dx ?? 0) + (animationOffset?.dx ?? 0),
				top: widget.position.y + (previewOffset?.dy ?? 0) + (animationOffset?.dy ?? 0),
				width: size.width,
				height: size.height,
				zIndex: widget.stackOrder + HMI_WIDGET_ZINDEX_OFFSET,
				outline: isSelected && !isSimulation ? "2px dashed #1976d2" : "none",
				cursor: isSimulation ? "default" : "grab",
			}}
		>
			<Component
				data={widget.data}
				value={value}
				selected={isSelected && !isSimulation}
				onValueChange={
					isSimulation && boundMnemonic !== null ? (v) => onSetVariableValue(boundMnemonic, v) : undefined
				}
				onTrigger={isSimulation ? (eventName) => onTriggerEvent(widget.id, eventName) : undefined}
			/>
			{showResizeHandle && !isSimulation && (
				<Box
					onMouseDown={onResizeStart}
					sx={{
						position: "absolute",
						right: -RESIZE_HANDLE_SIZE / 2,
						bottom: -RESIZE_HANDLE_SIZE / 2,
						width: RESIZE_HANDLE_SIZE,
						height: RESIZE_HANDLE_SIZE,
						borderRadius: "2px",
						backgroundColor: "#1976d2",
						border: "1px solid #fff",
						cursor: "nwse-resize",
					}}
				/>
			)}
		</Box>
	);
};

export default HmiWidgetItem;
