import {
	HMI_CANVAS_HEIGHT,
	HMI_CANVAS_WIDTH,
} from "@/schemas/hmi/hmi-page.schema";
import WidgetAddCommand from "@/schemas/hmi/commands/widget-add.command";
import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import { createRandomId } from "@/ids";
import { getLastMousePosition } from "@/ui/lib/mouse-position";
import { snapToGrid } from "@/ui/components/hmi/view/constants";
import { nextCopyName } from "@/lib/naming";
import AbstractCopyCutPasteManager from "@/ui/stores/shared/abstract-copy-cut-paste.manager";
import { HmiStoreGetFunction, HmiStoreSetFunction } from "../hmi.store";

/** Repli quand le curseur n'est pas au-dessus du canvas (ex. collage déclenché depuis un menu
 * ailleurs à l'écran) : décale d'un pas fixe pour ne jamais empiler sur les originaux. */
const PASTE_FALLBACK_OFFSET = 20;

export default class HmiCopyCutPasteManager extends AbstractCopyCutPasteManager<{
	widgets: HmiWidget[];
}> {
	protected readonly scope = "hmi" as const;
	private setStoreState: HmiStoreSetFunction;
	private getStoreState: HmiStoreGetFunction;

	constructor(
		setStoreState: HmiStoreSetFunction,
		getStoreState: HmiStoreGetFunction,
	) {
		super();
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	copySelectedElements(): void {
		const { hmiPage, selectedWidgetIds } = this.getStoreState();
		const widgets = Object.values(hmiPage.widgets).filter((w) =>
			selectedWidgetIds.includes(w.id),
		);
		if (widgets.length === 0) return;
		this.writeClipboard({ widgets: widgets.map((w) => w.copy()) });
	}

	protected isSelectionEmpty(): boolean {
		return this.getStoreState().selectedWidgetIds.length === 0;
	}

	protected deleteSelectedElements(): void {
		this.getStoreState().removeSelectedWidgets();
	}

	/** Colle sous le curseur quand il survole le canvas (comme le grafcet/ladder), sinon avec un
	 * décalage fixe depuis la position d'origine. */
	pasteElements(mousePosition?: { x: number; y: number }): void {
		const clipboard = this.readClipboard();
		if (!clipboard || clipboard.widgets.length === 0) return;
		const widgets = clipboard.widgets;

		const boundsLeft = Math.min(...widgets.map((w) => w.position.x));
		const boundsTop = Math.min(...widgets.map((w) => w.position.y));
		const boundsRight = Math.max(
			...widgets.map((w) => w.position.x + w.size.width),
		);
		const boundsBottom = Math.max(
			...widgets.map((w) => w.position.y + w.size.height),
		);

		const cursor = mousePosition ?? getLastMousePosition();
		const cursorCanvasPosition =
			this.getStoreState().screenToCanvasPosition?.(cursor.x, cursor.y) ?? null;

		let dx: number;
		let dy: number;
		if (cursorCanvasPosition) {
			const width = boundsRight - boundsLeft;
			const height = boundsBottom - boundsTop;
			const targetLeft = Math.max(
				0,
				Math.min(HMI_CANVAS_WIDTH - width, cursorCanvasPosition.x - width / 2),
			);
			const targetTop = Math.max(
				0,
				Math.min(
					HMI_CANVAS_HEIGHT - height,
					cursorCanvasPosition.y - height / 2,
				),
			);
			dx = targetLeft - boundsLeft;
			dy = targetTop - boundsTop;
		} else {
			dx = PASTE_FALLBACK_OFFSET;
			dy = PASTE_FALLBACK_OFFSET;
		}

		// Préserve la hiérarchie relative du clipboard, pas ses écarts : les widgets collés
		// repartent groupés juste au-dessus du plus haut widget actuel de la page (ex. clipboard à
		// 5/9/10, widget le plus haut à 20 -> collés à 21/22/23).
		const baseStackOrder = HmiWidget.nextStackOrder(
			Object.values(this.getStoreState().hmiPage.widgets),
		);
		const stackOrderByOriginalId = new Map(
			[...widgets]
				.sort((a, b) => a.stackOrder - b.stackOrder)
				.map((widget, i) => [widget.id, baseStackOrder + i] as const),
		);

		// Un widget collé ne peut pas garder le nom de son original (unicité par page, voir
		// `HmiWidgetBase.name`) : la copie est suffixée à partir de ce nom (`Bouton` -> `Bouton_2`),
		// en accumulant au fil du collage pour que deux widgets collés ensemble diffèrent.
		const namingContext = Object.values(this.getStoreState().hmiPage.widgets);
		const newWidgets = widgets.map((widget) => {
			// Les widgets collés retombent sur la grille (comme un dépôt depuis la palette), même si
			// l'original a été placé ou redimensionné hors grille via le panneau Propriétés.
			const x = snapToGrid(
				Math.max(
					0,
					Math.min(
						HMI_CANVAS_WIDTH - widget.size.width,
						widget.position.x + dx,
					),
				),
			);
			const y = snapToGrid(
				Math.max(
					0,
					Math.min(
						HMI_CANVAS_HEIGHT - widget.size.height,
						widget.position.y + dy,
					),
				),
			);
			const newWidget = HmiWidget.createInstance(
				createRandomId(),
				widget.type,
				nextCopyName(
					widget.name,
					namingContext.map((w) => w.name),
				),
				{ x, y },
				{ ...widget.size },
				stackOrderByOriginalId.get(widget.id)!,
				{ ...widget.data },
			);
			namingContext.push(newWidget);
			return newWidget;
		});

		this.getStoreState().commandsStackManager.executeOperation(
			newWidgets.map(
				(widget) =>
					new WidgetAddCommand({
						id: widget.id,
						type: widget.type,
						name: widget.name,
						position: widget.position,
						size: widget.size,
						stackOrder: widget.stackOrder,
						data: widget.data,
					}),
			),
		);
		//Le collage devient la nouvelle sélection — pratique pour le déplacer aussitôt, comme au
		//collage d'éléments grafcet/ladder.
		this.setStoreState(() => ({
			selectedWidgetIds: newWidgets.map((w) => w.id),
		}));
		//Coller à nouveau décale depuis la position déjà collée, pas depuis l'original — sans quoi
		//des collages répétés au même endroit du canvas s'empileraient exactement.
		this.writeClipboard({ widgets: newWidgets });
	}
}
