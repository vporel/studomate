"use client";

import {
	HMI_CANVAS_HEIGHT,
	HMI_CANVAS_WIDTH,
} from "@/schemas/hmi/hmi-page.schema";
import {
	HmiAction,
	HmiWidget,
	HmiWidgetSize,
} from "@/schemas/hmi/hmi-widget.schema";
import HmiContextMenu from "@/ui/components/hmi/context-menu/HmiContextMenu";
import useHmiContextMenu from "@/ui/components/hmi/context-menu/useHmiContextMenu";
import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { Box, Typography } from "@mui/material";
import {
	MouseEvent as ReactMouseEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
	WheelEvent as ReactWheelEvent,
} from "react";
import { clampZoom, SNAP_GRID, ZOOM_STEP } from "./constants";
import { executeHmiAction } from "./hmi-action.executor";
import { resolvePositionAnimationOffset } from "./hmi-position-animation";
import HmiCanvasSidebarSection from "./HmiCanvasSidebarSection";
import HmiObjectsPanel from "./HmiObjectsPanel";
import HmiPagePropertiesPanel from "./HmiPagePropertiesPanel";
import HmiWidgetAnimationsPane from "./HmiWidgetAnimationsPane";
import HmiWidgetEventsPane from "./HmiWidgetEventsPane";
import HmiWidgetItem from "./HmiWidgetItem";
import HmiWidgetPropertiesPanel from "./HmiWidgetPropertiesPanel";
import useHmiCanvasDrop from "./useHmiCanvasDrop";
import useHmiMarqueeSelect, { HmiMarqueeRect } from "./useHmiMarqueeSelect";
import useHmiWidgetDrag, { HmiDragPreview } from "./useHmiWidgetDrag";
import useHmiWidgetResize from "./useHmiWidgetResize";

interface HmiCanvasProps {
	isSimulation: boolean;
	zoom: number;
	onZoomChange: (zoom: number) => void;
}

const HmiCanvas = ({ isSimulation, zoom, onZoomChange }: HmiCanvasProps) => {
	const hmiPage = useHmiStore((s) => s.hmiPage);
	const selectedWidgetIds = useHmiStore((s) => s.selectedWidgetIds);
	const selectWidget = useHmiStore((s) => s.selectWidget);
	const setSelection = useHmiStore((s) => s.setSelection);
	const clearSelection = useHmiStore((s) => s.clearSelection);
	const setScreenToCanvasPosition = useHmiStore(
		(s) => s.setScreenToCanvasPosition,
	);
	const simulationVariablesStates = useProjectStore(
		(s) => s.simulationVariablesStates,
	);
	const simulationManager = useProjectStore((s) => s.simulationManager);
	const hmiManager = useProjectStore((s) => s.hmiManager);
	const project = useProjectStore((s) => s.project);

	const [dragPreview, setDragPreview] = useState<HmiDragPreview | null>(null);
	const [resizePreview, setResizePreview] = useState<HmiWidgetSize | null>(
		null,
	);
	const [marqueeRect, setMarqueeRect] = useState<HmiMarqueeRect | null>(null);

	const startDrag = useHmiWidgetDrag(zoom, setDragPreview);
	const startResize = useHmiWidgetResize(zoom, setResizePreview);
	const [onDragOver, onDrop] = useHmiCanvasDrop(zoom, isSimulation);

	const canvasWrapperRef = useRef<HTMLDivElement>(null);
	// Le `click` natif qui suit un glisser atterrit parfois sur le canvas (mousedown et mouseup
	// tous deux sur le fond vide) — sans ce garde-fou, `handleCanvasClick` effacerait aussitôt la
	// sélection que la sélection rectangulaire vient de poser.
	const suppressNextCanvasClickRef = useRef(false);
	const startMarqueeSelect = useHmiMarqueeSelect(
		canvasWrapperRef,
		zoom,
		Object.values(hmiPage.widgets),
		(ids) => {
			suppressNextCanvasClickRef.current = true;
			setSelection(ids);
		},
		setMarqueeRect,
	);
	const {
		visible: contextMenuVisible,
		element: contextMenuElement,
		position: contextMenuPosition,
		openContextMenu,
		closeContextMenu,
	} = useHmiContextMenu(canvasWrapperRef);

	// Convertisseur écran -> canvas pour le collage au curseur (voir HmiCopyCutPasteManager),
	// équivalent HMI de `rfInstance.screenToFlowPosition`. Recalculé à chaque changement de zoom.
	useEffect(() => {
		setScreenToCanvasPosition((clientX, clientY) => {
			const el = canvasWrapperRef.current;
			if (!el) return null;
			const rect = el.getBoundingClientRect();
			if (
				clientX < rect.left ||
				clientX > rect.right ||
				clientY < rect.top ||
				clientY > rect.bottom
			)
				return null;
			return {
				x: (clientX - rect.left) / zoom,
				y: (clientY - rect.top) / zoom,
			};
		});
	}, [zoom, setScreenToCanvasPosition]);

	// Molette seule = défilement normal (rendu au conteneur scrollable ambiant) ; le zoom
	// n'intervient qu'avec Ctrl (Windows/Linux) ou Cmd (Mac) maintenu.
	const handleWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
		if (!e.ctrlKey && !e.metaKey) return;
		e.preventDefault();
		onZoomChange(clampZoom(zoom - Math.sign(e.deltaY) * ZOOM_STEP));
	};

	/** Retourne la valeur brute de la variable (boolean ou number selon le type PLC). */
	const getVariableValue = useCallback(
		(mnemonic: string): unknown => {
			if (!mnemonic) return undefined;
			const entry = Object.values(simulationVariablesStates).find(
				(s) => s.mnemonic === mnemonic,
			);
			return entry?.value;
		},
		[simulationVariablesStates],
	);

	/** Écrit une valeur dans la variable liée au widget — entrée physique ou mémoire. Une sortie
	 * n'est jamais ciblée : `HmiWidgetPropertiesPanel` l'exclut du sélecteur de variable pour tout
	 * widget écrivain. */
	const setVariableValue = useCallback(
		(mnemonic: string, value: boolean | number) => {
			if (!project) return;
			const variable = project.variables.find((v) => v.mnemonic === mnemonic);
			if (!variable) return;
			if (variable.getDirection() === "IN") {
				simulationManager.setPhysicalInputValue(variable.id, value);
			} else {
				simulationManager.setMemoryValue(variable.id, value);
			}
		},
		[project, simulationManager],
	);

	/** Décalage courant de position d'un widget — inactif hors simulation (voir
	 * `resolvePositionAnimationOffset`). */
	const getPositionAnimationOffset = useCallback(
		(widget: HmiWidget): { dx: number; dy: number } | undefined =>
			isSimulation
				? resolvePositionAnimationOffset(widget, getVariableValue)
				: undefined,
		[isSimulation, getVariableValue],
	);

	/** Exécute les actions liées à l'événement nommé du widget (voir `HmiWidgetEvents`) — `events`
	 * peut être absent de `widget.data` tant qu'aucune action n'y a été ajoutée. */
	const triggerWidgetEvent = useCallback(
		(widgetId: string, eventName: string) => {
			const widget = hmiPage.widgets[widgetId];
			if (!widget) return;
			const actions = (widget.data as { events?: Record<string, HmiAction[]> })
				.events?.[eventName];
			actions?.forEach((action) => executeHmiAction(action, hmiManager));
		},
		[hmiPage.widgets, hmiManager],
	);

	const handleCanvasClick = () => {
		if (isSimulation) return;
		if (suppressNextCanvasClickRef.current) {
			suppressNextCanvasClickRef.current = false;
			return;
		}
		clearSelection();
	};

	/** Démarre la sélection rectangulaire — ne se déclenche que sur la zone vide du canvas : le
	 * mousedown d'un widget stoppe déjà sa propagation (voir `handleWidgetDragStart`). */
	const handleCanvasMouseDown = (e: ReactMouseEvent) => {
		if (isSimulation) return;
		startMarqueeSelect(e, selectedWidgetIds);
	};

	const handleCanvasContextMenu = (e: ReactMouseEvent) => {
		if (isSimulation) return;
		e.preventDefault();
		openContextMenu(e, { type: "pane" });
	};

	const handleWidgetContextMenu = (e: ReactMouseEvent, widget: HmiWidget) => {
		if (isSimulation) return;
		e.preventDefault();
		e.stopPropagation();
		if (!selectedWidgetIds.includes(widget.id)) selectWidget(widget.id);
		openContextMenu(e, { type: "widget", widgetId: widget.id });
	};

	/** Clic simple = ne sélectionne que ce widget (sauf s'il fait déjà partie de la sélection en
	 * cours, auquel cas on la préserve pour pouvoir la glisser en groupe). Shift/Ctrl/Cmd =
	 * ajoute/retire ce widget de la sélection. Le glisser démarre sur le résultat, qu'il s'agisse
	 * d'un seul widget ou du groupe entier. */
	const handleWidgetDragStart = (e: ReactMouseEvent, widget: HmiWidget) => {
		if (isSimulation) return;
		e.stopPropagation();
		const additive = e.shiftKey || e.ctrlKey || e.metaKey;
		const nextSelection = additive
			? selectedWidgetIds.includes(widget.id)
				? selectedWidgetIds.filter((id) => id !== widget.id)
				: [...selectedWidgetIds, widget.id]
			: selectedWidgetIds.includes(widget.id)
				? selectedWidgetIds
				: [widget.id];
		setSelection(nextSelection);
		if (nextSelection.length === 0) return;
		const group = Object.values(hmiPage.widgets).filter((w) =>
			nextSelection.includes(w.id),
		);
		startDrag(e, group);
	};

	const selectedWidgets = Object.values(hmiPage.widgets).filter((w) =>
		selectedWidgetIds.includes(w.id),
	);
	const soleSelectedWidget =
		selectedWidgets.length === 1 ? selectedWidgets[0] : null;

	// Un seul bloc de la colonne latérale déplié à la fois (voir `HmiCanvasSidebarSection`).
	const [expandedSection, setExpandedSection] = useState<
		"properties" | "objects"
	>("properties");

	return (
		<Box
			sx={{
				display: "flex",
				gap: 1,
				justifyContent: "center",
				alignItems: "flex-start",
				p: 1,
				height: "100%",
				overflow: "auto",
			}}
		>
			{/* Conteneur aux dimensions zoomées — clippe le canvas transformé */}
			<Box
				ref={canvasWrapperRef}
				onWheel={handleWheel}
				onDragOver={onDragOver}
				onDrop={onDrop}
				sx={{
					position: "relative",
					overflow: "hidden",
					width: HMI_CANVAS_WIDTH * zoom,
					height: HMI_CANVAS_HEIGHT * zoom,
					flexShrink: 0,
				}}
			>
				{/* Canvas réel mis à l'échelle depuis le coin supérieur gauche */}
				<Box
					onClick={handleCanvasClick}
					onContextMenu={handleCanvasContextMenu}
					onMouseDown={handleCanvasMouseDown}
					sx={{
						width: HMI_CANVAS_WIDTH,
						height: HMI_CANVAS_HEIGHT,
						backgroundColor: "#fff",
						backgroundImage: isSimulation
							? "none"
							: "linear-gradient(to right, #e8e8e8 1px, transparent 1px), linear-gradient(to bottom, #e8e8e8 1px, transparent 1px)",
						backgroundSize: `${SNAP_GRID}px ${SNAP_GRID}px`,
						border: "1px solid #ccc",
						boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
						position: "relative",
						transformOrigin: "top left",
						transform: `scale(${zoom})`,
					}}
				>
					{Object.values(hmiPage.widgets).map((widget) => {
						const isSelected = selectedWidgetIds.includes(widget.id);
						// Hors simulation (page de conception), les widgets restent statiques même si une
						// simulation tourne : on ne lit pas l'état du simulateur. Une forme (rectangle,
						// ellipse, texte) n'a de toute façon pas de variable "principale" — voir
						// `RectangleData`/`EllipseData`/`TextData`.
						const rawValue =
							isSimulation && "variableMnemonic" in widget.data
								? getVariableValue(widget.data.variableMnemonic)
								: undefined;
						const value: boolean | number =
							typeof rawValue === "number" ? rawValue : Boolean(rawValue);
						return (
							<HmiWidgetItem
								key={widget.id}
								widget={widget}
								isSelected={isSelected}
								isSimulation={isSimulation}
								showResizeHandle={
									isSelected && soleSelectedWidget?.id === widget.id
								}
								value={value}
								previewOffset={
									isSelected && dragPreview?.widgetIds.includes(widget.id)
										? { dx: dragPreview.dx, dy: dragPreview.dy }
										: undefined
								}
								previewSize={
									soleSelectedWidget?.id === widget.id
										? (resizePreview ?? undefined)
										: undefined
								}
								animationOffset={getPositionAnimationOffset(widget)}
								onSetVariableValue={setVariableValue}
								onTriggerEvent={triggerWidgetEvent}
								onDragStart={(e) => handleWidgetDragStart(e, widget)}
								onResizeStart={(e) => {
									if (isSimulation) return;
									e.stopPropagation();
									startResize(e, widget);
								}}
								onContextMenu={(e) => handleWidgetContextMenu(e, widget)}
							/>
						);
					})}

					{marqueeRect && (
						<Box
							sx={{
								position: "absolute",
								left: marqueeRect.x,
								top: marqueeRect.y,
								width: marqueeRect.width,
								height: marqueeRect.height,
								border: "1px solid #1976d2",
								backgroundColor: "rgba(25, 118, 210, 0.1)",
								pointerEvents: "none",
							}}
						/>
					)}
				</Box>

				<HmiContextMenu
					visible={contextMenuVisible}
					element={contextMenuElement}
					position={contextMenuPosition}
					onClose={closeContextMenu}
					canvasWidth={HMI_CANVAS_WIDTH * zoom}
					canvasHeight={HMI_CANVAS_HEIGHT * zoom}
				/>
			</Box>

			{!isSimulation && (
				<Box
					sx={{
						width: 300,
						flexShrink: 0,
						display: "flex",
						flexDirection: "column",
						gap: 1,
						// Somme des hauteurs des blocs bornée à celle du canvas affiché — chacun défile
						// dans son propre espace plutôt que de dépasser (voir `HmiCanvasSidebarSection`).
						maxHeight: HMI_CANVAS_HEIGHT * zoom,
					}}
				>
					<HmiCanvasSidebarSection
						title="Propriétés"
						collapsed={expandedSection !== "properties"}
						onToggle={() => setExpandedSection("properties")}
					>
						{soleSelectedWidget ? (
							<HmiWidgetPropertiesPanel widget={soleSelectedWidget} />
						) : selectedWidgets.length > 1 ? (
							<Typography
								sx={{ px: 1.5, pb: 1.5, fontSize: "0.8rem", color: "#888" }}
							>
								{selectedWidgets.length} widgets sélectionnés.
							</Typography>
						) : (
							<HmiPagePropertiesPanel hmiPageId={hmiPage.id} />
						)}
					</HmiCanvasSidebarSection>
					<HmiCanvasSidebarSection
						title="Objets"
						fillRemainingSpace
						collapsed={expandedSection !== "objects"}
						onToggle={() => setExpandedSection("objects")}
					>
						<HmiObjectsPanel />
					</HmiCanvasSidebarSection>
				</Box>
			)}

			{soleSelectedWidget && (
				<HmiWidgetEventsPane widget={soleSelectedWidget} />
			)}
			{soleSelectedWidget && (
				<HmiWidgetAnimationsPane widget={soleSelectedWidget} />
			)}
		</Box>
	);
};

export default HmiCanvas;
