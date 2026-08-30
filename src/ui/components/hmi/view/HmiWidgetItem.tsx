"use client";

import {
	HmiWidget,
	HmiWidgetPosition,
	HmiWidgetSize,
} from "@/schemas/hmi/hmi-widget.schema";
import { HMI_WIDGET_UI } from "@/ui/components/hmi/widgets/hmi-widget-ui";
import { Box } from "@mui/material";
import { MouseEvent as ReactMouseEvent } from "react";
import { HMI_WIDGET_ZINDEX_OFFSET } from "./constants";
import { HmiResizeDirection } from "./useHmiWidgetResize";

const RESIZE_HANDLE_SIZE = 10;

/** Les huit poignées : position CSS dans le wrapper du widget et curseur associé. */
const RESIZE_HANDLES: {
	direction: HmiResizeDirection;
	cursor: string;
	style: { top?: string; bottom?: string; left?: string; right?: string };
}[] = [
	{ direction: "nw", cursor: "nwse-resize", style: { top: "0%", left: "0%" } },
	{ direction: "n", cursor: "ns-resize", style: { top: "0%", left: "50%" } },
	{ direction: "ne", cursor: "nesw-resize", style: { top: "0%", left: "100%" } },
	{ direction: "e", cursor: "ew-resize", style: { top: "50%", left: "100%" } },
	{
		direction: "se",
		cursor: "nwse-resize",
		style: { top: "100%", left: "100%" },
	},
	{ direction: "s", cursor: "ns-resize", style: { top: "100%", left: "50%" } },
	{
		direction: "sw",
		cursor: "nesw-resize",
		style: { top: "100%", left: "0%" },
	},
	{ direction: "w", cursor: "ew-resize", style: { top: "50%", left: "0%" } },
];

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
	/** Position visuelle pendant un redimensionnement en cours : une poignée nord/ouest déplace le
	 * coin haut-gauche autant qu'elle change la taille (voir `useHmiWidgetResize`). */
	previewPosition?: HmiWidgetPosition;
	/** Décalage courant de l'animation de position en simulation (voir `HmiPositionAnimation`) —
	 * s'ajoute à `previewOffset`, qui ne s'applique lui qu'en conception. */
	animationOffset?: { dx: number; dy: number };
	onSetVariableValue: (mnemonic: string, value: boolean | number) => void;
	onTriggerEvent: (widgetId: string, eventName: string) => void;
	onDragStart: (e: ReactMouseEvent) => void;
	onResizeStart: (e: ReactMouseEvent, direction: HmiResizeDirection) => void;
	onContextMenu: (e: ReactMouseEvent) => void;
}

/** Un widget posé sur le canvas : son wrapper positionné (drag, sélection), son rendu — délégué
 * au composant associé à `widget.type` via `HMI_WIDGET_UI` — et sa poignée de
 * redimensionnement quand il est seul sélectionné. */
const HmiWidgetItem = ({
	widget,
	isSelected,
	isSimulation,
	showResizeHandle,
	value,
	previewOffset,
	previewSize,
	previewPosition,
	animationOffset,
	onSetVariableValue,
	onTriggerEvent,
	onDragStart,
	onResizeStart,
	onContextMenu,
}: HmiWidgetItemProps) => {
	const Component = HMI_WIDGET_UI[widget.type].component;
	const size = previewSize ?? widget.size;
	// Une forme (rectangle, ellipse, texte) n'a pas de variable "principale" à écrire en
	// simulation — voir `RectangleData`/`EllipseData`/`TextData`.
	const boundMnemonic =
		"variable" in widget.data ? widget.data.variable : null;

	return (
		<Box
			onMouseDown={onDragStart}
			onClick={(e) => e.stopPropagation()}
			onContextMenu={onContextMenu}
			sx={{
				position: "absolute",
				left:
					previewPosition?.x ??
					widget.position.x +
						(previewOffset?.dx ?? 0) +
						(animationOffset?.dx ?? 0),
				top:
					previewPosition?.y ??
					widget.position.y +
						(previewOffset?.dy ?? 0) +
						(animationOffset?.dy ?? 0),
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
				animationsEnabled={isSimulation}
				selected={isSelected && !isSimulation}
				onValueChange={
					isSimulation && boundMnemonic !== null
						? (v) => onSetVariableValue(boundMnemonic, v)
						: undefined
				}
				onTrigger={
					isSimulation
						? (eventName) => onTriggerEvent(widget.id, eventName)
						: undefined
				}
			/>
			{showResizeHandle &&
				!isSimulation &&
				RESIZE_HANDLES.map(({ direction, cursor, style }) => (
					<Box
						key={direction}
						onMouseDown={(e) => onResizeStart(e, direction)}
						sx={{
							position: "absolute",
							...style,
							transform: "translate(-50%, -50%)",
							width: RESIZE_HANDLE_SIZE,
							height: RESIZE_HANDLE_SIZE,
							borderRadius: "2px",
							backgroundColor: "#1976d2",
							border: "1px solid #fff",
							cursor,
						}}
					/>
				))}
		</Box>
	);
};

export default HmiWidgetItem;
