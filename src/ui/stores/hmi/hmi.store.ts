import CommandsStack from "@/schemas/commands/commands-stack.schema";
import WidgetAddCommand from "@/schemas/hmi/commands/widget-add.command";
import WidgetRemoveCommand from "@/schemas/hmi/commands/widget-remove.command";
import WidgetUpdateCommand from "@/schemas/hmi/commands/widget-update.command";
import HmiPage from "@/schemas/hmi/hmi-page.schema";
import {
	HmiWidget,
	HmiWidgetData,
	HmiWidgetPosition,
	HmiWidgetSize,
	HmiWidgetType,
} from "@/schemas/hmi/hmi-widget.schema";
import { createStore } from "zustand";
import { snapToGrid } from "@/ui/components/hmi/view/constants";
import HmiCommandsStackManager from "./managers/commands-stack.manager";
import HmiCopyCutPasteManager from "./managers/copy-cut-paste.manager";

/** Alignement d'une sélection de widgets (voir `HmiStoreState.alignSelectedWidgets`) — "top"/
 * "bottom" alignent les bords sur le widget le plus haut/bas de la sélection, "left"/"right" de
 * même sur le widget le plus à gauche/droite ; "center-vertical"/"center-horizontal" centrent
 * chaque widget sur le milieu de l'étendue totale de la sélection dans cet axe. */
export type HmiWidgetAlignment =
	"top" | "bottom" | "center-vertical" | "left" | "right" | "center-horizontal";

export interface HmiStoreState {
	hmiPage: HmiPage;
	/** Ids des widgets sélectionnés en mode édition. Le panel de propriétés ne s'affiche que si
	 * elle en contient exactement un ; la poignée de redimensionnement, de même. */
	selectedWidgetIds: string[];

	/** Remplace la sélection par ce seul widget (ou la vide si `null`). */
	selectWidget: (widgetId: string | null) => void;
	/** Ajoute/retire ce widget de la sélection (Ctrl/Shift-clic), sans toucher au reste. */
	toggleWidgetSelection: (widgetId: string) => void;
	/** Remplace la sélection entière — utilisé quand l'appelant a déjà calculé le résultat voulu
	 * (ex. clic-glissé avec modificateur, qui doit démarrer le glisser sur ce même résultat). */
	setSelection: (widgetIds: string[]) => void;
	selectAllWidgets: () => void;
	clearSelection: () => void;
	addWidget: (
		type: HmiWidgetType,
		x: number,
		y: number,
		sizeOverride?: HmiWidgetSize,
		dataOverride?: Partial<HmiWidgetData>,
	) => HmiWidget;
	/** Un `name` en doublon (ou vide) sur la page est silencieusement ignoré — le reste de
	 * `partial` s'applique quand même. */
	updateWidget: (
		widgetId: string,
		partial: {
			name?: string;
			position?: HmiWidgetPosition;
			size?: HmiWidgetSize;
			stackOrder?: number;
			data?: Partial<HmiWidgetData>;
		},
	) => void;
	/** Déplace plusieurs widgets d'un même delta en une seule commande annulable (glisser-déposer
	 * d'une sélection multiple). */
	moveWidgets: (widgetIds: string[], dx: number, dy: number) => void;
	/** Aligne verticalement les widgets sélectionnés (voir `HmiWidgetAlignment`) — sans effet à
	 * moins de deux widgets sélectionnés. */
	alignSelectedWidgets: (alignment: HmiWidgetAlignment) => void;
	removeSelectedWidgets: () => void;

	/** Échange l'ordre d'empilement avec le widget immédiatement au-dessus (voisin par
	 * `stackOrder` trié, pas `stackOrder + 1` — robuste aux trous laissés par une suppression).
	 * Sans effet si `widgetId` est déjà au premier plan. */
	bringForward: (widgetId: string) => void;
	/** Symétrique de `bringForward`, avec le voisin immédiatement en dessous. */
	sendBackward: (widgetId: string) => void;
	/** Place le widget au premier plan : il prend le plus grand `stackOrder`, et tous les widgets
	 * qui étaient au-dessus de lui reculent d'un cran pour combler l'écart — l'ordre relatif des
	 * autres widgets est préservé. Sans effet si `widgetId` est déjà au premier plan. */
	bringToFront: (widgetId: string) => void;
	/** Symétrique de `bringToFront` : le widget prend `0`, ceux qui étaient en dessous avancent
	 * d'un cran. */
	sendToBack: (widgetId: string) => void;
	/** Remplace la page entière — appelé par HmiManager après une écriture dans le projet. */
	adoptHmiPage: (page: HmiPage) => void;

	/** Visibilité du pane "Animations" (voir `HmiWidgetAnimationsPane`) — un pane, pas une modale
	 * MUI, mais même principe : pilotable depuis n'importe quel composant (ex. le bouton du panel
	 * de propriétés), donc porté par le store plutôt qu'un état React local. */
	animationsPaneVisible: boolean;
	openAnimationsPane: () => void;
	closeAnimationsPane: () => void;

	/** Même principe que `animationsPaneVisible`, pour le pane "Événements" (voir
	 * `HmiWidgetEventsPane`). */
	eventsPaneVisible: boolean;
	openEventsPane: () => void;
	closeEventsPane: () => void;

	/**
	 * Convertit une position écran (ex. `getLastMousePosition()`) en position canvas (non zoomée),
	 * ou `null` si le curseur n'est pas au-dessus du canvas — équivalent HMI de
	 * `rfInstance.screenToFlowPosition` pour le grafcet/ladder. Enregistré par `HmiCanvas`, qui
	 * seul connaît son élément DOM et le zoom courant.
	 */
	screenToCanvasPosition:
		((clientX: number, clientY: number) => HmiWidgetPosition | null) | null;
	setScreenToCanvasPosition: (
		fn: HmiStoreState["screenToCanvasPosition"],
	) => void;

	copyCutPasteManager: HmiCopyCutPasteManager;

	//=============== COMMANDS STACK ===============
	hasCommandsToUndo: boolean;
	hasCommandsToRedo: boolean;
	commandsStackManager: HmiCommandsStackManager;
}

export type HmiStoreSetFunction = (
	partial:
		| HmiStoreState
		| Partial<HmiStoreState>
		| ((state: HmiStoreState) => HmiStoreState | Partial<HmiStoreState>),
) => void;

export type HmiStoreGetFunction = () => HmiStoreState;

function widgetAddCommand(widget: HmiWidget): WidgetAddCommand {
	return new WidgetAddCommand({
		id: widget.id,
		type: widget.type,
		name: widget.name,
		position: widget.position,
		size: widget.size,
		stackOrder: widget.stackOrder,
		data: widget.data,
	});
}

function widgetRemoveCommand(widget: HmiWidget): WidgetRemoveCommand {
	return new WidgetRemoveCommand({
		id: widget.id,
		type: widget.type,
		name: widget.name,
		position: widget.position,
		size: widget.size,
		stackOrder: widget.stackOrder,
		data: widget.data,
	});
}

export const createHmiStore = (
	initialHmiPage: HmiPage,
	commandsStack: CommandsStack<HmiPage>,
) =>
	createStore<HmiStoreState>((set, get) => ({
		hmiPage: initialHmiPage,
		selectedWidgetIds: [],

		selectWidget: (widgetId) =>
			set(() => ({ selectedWidgetIds: widgetId ? [widgetId] : [] })),

		toggleWidgetSelection: (widgetId) =>
			set((state) => ({
				selectedWidgetIds: state.selectedWidgetIds.includes(widgetId)
					? state.selectedWidgetIds.filter((id) => id !== widgetId)
					: [...state.selectedWidgetIds, widgetId],
			})),

		setSelection: (widgetIds) => set(() => ({ selectedWidgetIds: widgetIds })),

		selectAllWidgets: () =>
			set((state) => ({
				selectedWidgetIds: Object.values(state.hmiPage.widgets).map(
					(w) => w.id,
				),
			})),

		clearSelection: () => set(() => ({ selectedWidgetIds: [] })),

		addWidget: (type, x, y, sizeOverride, dataOverride) => {
			const { widgets } = get().hmiPage;
			const stackOrder = HmiWidget.nextStackOrder(Object.values(widgets));
			const name = HmiWidget.nextName(type, Object.values(widgets));
			const widget = HmiWidget.create(
				type,
				x,
				y,
				sizeOverride,
				dataOverride,
				stackOrder,
				name,
			);
			get().commandsStackManager.executeOperation([widgetAddCommand(widget)]);
			set(() => ({ selectedWidgetIds: [widget.id] }));
			return widget;
		},

		updateWidget: (widgetId, partial) => {
			const widget = get().hmiPage.widgets[widgetId];
			if (!widget) return;
			// Un nom vide ou déjà pris par un autre widget de la page est ignoré (voir
			// `HmiWidgetBase.name` — unicité par page) : ni renommé, ni mis en pile.
			const name = partial.name?.trim();
			const nameIsValid =
				name !== undefined &&
				name !== "" &&
				!Object.values(get().hmiPage.widgets).some(
					(w) => w.id !== widgetId && w.name === name,
				);
			// Un renommage invalide, seul champ demandé, ne doit pas empiler une commande à vide.
			if (
				partial.name !== undefined &&
				!nameIsValid &&
				Object.keys(partial).length === 1
			)
				return;
			// Snapshot générique champ par champ pour `previousData` : `partial.data` peut porter des
			// champs propres à n'importe quel type de widget (`min`, `behavior`, `style`...), pas
			// seulement ceux communs à tous (`keyof HmiWidgetData`, union discriminée, ne donnerait
			// que l'intersection — `variableMnemonic`/`label`).
			const previousData: Record<string, unknown> = {};
			if (partial.data) {
				const currentData = widget.data as Record<string, unknown>;
				Object.keys(partial.data).forEach((key) => {
					previousData[key] = currentData[key];
				});
			}
			get().commandsStackManager.executeOperation([
				new WidgetUpdateCommand({
					widgetId,
					name: nameIsValid ? name : undefined,
					previousName: nameIsValid ? widget.name : undefined,
					position: partial.position,
					previousPosition:
						partial.position !== undefined ? { ...widget.position } : undefined,
					size: partial.size,
					previousSize:
						partial.size !== undefined ? { ...widget.size } : undefined,
					stackOrder: partial.stackOrder,
					previousStackOrder:
						partial.stackOrder !== undefined ? widget.stackOrder : undefined,
					data: partial.data,
					previousData:
						partial.data !== undefined
							? (previousData as Partial<HmiWidgetData>)
							: undefined,
				}),
			]);
		},

		moveWidgets: (widgetIds, dx, dy) => {
			if (dx === 0 && dy === 0) return;
			const { hmiPage } = get();
			const commands = widgetIds.flatMap((widgetId) => {
				const widget = hmiPage.widgets[widgetId];
				if (!widget) return [];
				const previousPosition = { ...widget.position };
				const position = {
					x: previousPosition.x + dx,
					y: previousPosition.y + dy,
				};
				return [
					new WidgetUpdateCommand({ widgetId, position, previousPosition }),
				];
			});
			get().commandsStackManager.executeOperation(commands);
		},

		alignSelectedWidgets: (alignment) => {
			const { selectedWidgetIds, hmiPage } = get();
			const widgets = Object.values(hmiPage.widgets).filter((w) =>
				selectedWidgetIds.includes(w.id),
			);
			if (widgets.length < 2) return;

			const isHorizontal =
				alignment === "left" ||
				alignment === "right" ||
				alignment === "center-horizontal";
			const coordOf = (w: HmiWidget) =>
				isHorizontal ? w.position.x : w.position.y;
			const sizeOf = (w: HmiWidget) =>
				isHorizontal ? w.size.width : w.size.height;

			// "Le plus haut/bas" (ou "à gauche/droite") désigne un seul widget de la sélection (celui
			// de plus petit/plus grand coordonnée sur cet axe), pas la borne de leur boîte
			// englobante — voir la demande d'origine. Même raisonnement sur les deux axes, juste
			// x/largeur au lieu de y/hauteur.
			const startWidget = Object.values(widgets).reduce((min, w) =>
				coordOf(w) < coordOf(min) ? w : min,
			);
			const endWidget = Object.values(widgets).reduce((max, w) =>
				coordOf(w) > coordOf(max) ? w : max,
			);
			const startCoord = coordOf(startWidget);
			const endEdge = coordOf(endWidget) + sizeOf(endWidget);

			const commands = Object.values(widgets).map((widget) => {
				const previousPosition = { ...widget.position };
				const rawCoord =
					alignment === "top" || alignment === "left"
						? startCoord
						: alignment === "bottom" || alignment === "right"
							? endEdge - sizeOf(widget)
							: (startCoord + endEdge) / 2 - sizeOf(widget) / 2;
				const coord = snapToGrid(rawCoord);
				const position = isHorizontal
					? { x: coord, y: previousPosition.y }
					: { x: previousPosition.x, y: coord };
				return new WidgetUpdateCommand({
					widgetId: widget.id,
					position,
					previousPosition,
				});
			});
			get().commandsStackManager.executeOperation(commands);
		},

		removeSelectedWidgets: () => {
			const { selectedWidgetIds, hmiPage } = get();
			if (selectedWidgetIds.length === 0) return;
			const commands = selectedWidgetIds.flatMap((id) => {
				const widget = hmiPage.widgets[id];
				return widget ? [widgetRemoveCommand(widget)] : [];
			});
			get().commandsStackManager.executeOperation(commands);
			set(() => ({ selectedWidgetIds: [] }));
		},

		bringForward: (widgetId) => {
			const { hmiPage } = get();
			const widget = hmiPage.widgets[widgetId];
			if (!widget) return;
			const above = Object.values(hmiPage.widgets)
				.filter((w) => w.stackOrder > widget.stackOrder)
				.sort((a, b) => a.stackOrder - b.stackOrder)[0];
			if (!above) return;
			get().commandsStackManager.executeOperation([
				new WidgetUpdateCommand({
					widgetId: widget.id,
					stackOrder: above.stackOrder,
					previousStackOrder: widget.stackOrder,
				}),
				new WidgetUpdateCommand({
					widgetId: above.id,
					stackOrder: widget.stackOrder,
					previousStackOrder: above.stackOrder,
				}),
			]);
		},

		sendBackward: (widgetId) => {
			const { hmiPage } = get();
			const widget = hmiPage.widgets[widgetId];
			if (!widget) return;
			const below = Object.values(hmiPage.widgets)
				.filter((w) => w.stackOrder < widget.stackOrder)
				.sort((a, b) => b.stackOrder - a.stackOrder)[0];
			if (!below) return;
			get().commandsStackManager.executeOperation([
				new WidgetUpdateCommand({
					widgetId: widget.id,
					stackOrder: below.stackOrder,
					previousStackOrder: widget.stackOrder,
				}),
				new WidgetUpdateCommand({
					widgetId: below.id,
					stackOrder: widget.stackOrder,
					previousStackOrder: below.stackOrder,
				}),
			]);
		},

		bringToFront: (widgetId) => {
			const { hmiPage } = get();
			const widget = hmiPage.widgets[widgetId];
			if (!widget) return;
			const above = Object.values(hmiPage.widgets).filter(
				(w) => w.stackOrder > widget.stackOrder,
			);
			if (above.length === 0) return;
			const maxStackOrder = Math.max(
				...Object.values(hmiPage.widgets).map((w) => w.stackOrder),
			);
			get().commandsStackManager.executeOperation([
				new WidgetUpdateCommand({
					widgetId: widget.id,
					stackOrder: maxStackOrder,
					previousStackOrder: widget.stackOrder,
				}),
				...above.map(
					(w) =>
						new WidgetUpdateCommand({
							widgetId: w.id,
							stackOrder: w.stackOrder - 1,
							previousStackOrder: w.stackOrder,
						}),
				),
			]);
		},

		sendToBack: (widgetId) => {
			const { hmiPage } = get();
			const widget = hmiPage.widgets[widgetId];
			if (!widget) return;
			const below = Object.values(hmiPage.widgets).filter(
				(w) => w.stackOrder < widget.stackOrder,
			);
			if (below.length === 0) return;
			get().commandsStackManager.executeOperation([
				new WidgetUpdateCommand({
					widgetId: widget.id,
					stackOrder: 0,
					previousStackOrder: widget.stackOrder,
				}),
				...below.map(
					(w) =>
						new WidgetUpdateCommand({
							widgetId: w.id,
							stackOrder: w.stackOrder + 1,
							previousStackOrder: w.stackOrder,
						}),
				),
			]);
		},

		adoptHmiPage: (page) => set(() => ({ hmiPage: page })),

		animationsPaneVisible: false,
		openAnimationsPane: () => set(() => ({ animationsPaneVisible: true })),
		closeAnimationsPane: () => set(() => ({ animationsPaneVisible: false })),

		eventsPaneVisible: false,
		openEventsPane: () => set(() => ({ eventsPaneVisible: true })),
		closeEventsPane: () => set(() => ({ eventsPaneVisible: false })),

		screenToCanvasPosition: null,
		setScreenToCanvasPosition: (fn) =>
			set(() => ({ screenToCanvasPosition: fn })),

		copyCutPasteManager: new HmiCopyCutPasteManager(set, get),

		//=============== COMMANDS STACK ===============
		//Lu depuis la pile, pas figé à false : l'historique survit à la fermeture de la page, donc
		//rouvrir une page HMI doit montrer les boutons annuler/rétablir toujours disponibles.
		hasCommandsToUndo: commandsStack.commandsToUndo.length > 0,
		hasCommandsToRedo: commandsStack.commandsToRedo.length > 0,
		commandsStackManager: new HmiCommandsStackManager(set, get, commandsStack),
	}));
