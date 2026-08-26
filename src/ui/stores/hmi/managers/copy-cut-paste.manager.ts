import { HMI_CANVAS_HEIGHT, HMI_CANVAS_WIDTH } from "@/schemas/hmi/hmi-page.schema";
import WidgetAddCommand from "@/schemas/hmi/commands/widget-add.command";
import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import { createRandomId } from "@/ids";
import { getLastMousePosition } from "@/ui/lib/mouse-position";
import { HmiStoreGetFunction, HmiStoreSetFunction } from "../hmi.store";

/** Repli quand le curseur n'est pas au-dessus du canvas (ex. collage déclenché depuis un menu
 * ailleurs à l'écran) : décale d'un pas fixe pour ne jamais empiler sur les originaux. */
const PASTE_FALLBACK_OFFSET = 20;

export default class CopyCutPasteManager {
	private setStoreState: HmiStoreSetFunction;
	private getStoreState: HmiStoreGetFunction;
	private clipboard: HmiWidget[] | null = null;

	constructor(setStoreState: HmiStoreSetFunction, getStoreState: HmiStoreGetFunction) {
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	copySelectedWidgets(): void {
		const { hmiPage, selectedWidgetIds } = this.getStoreState();
		const widgets = hmiPage.widgets.filter((w) => selectedWidgetIds.includes(w.id));
		if (widgets.length === 0) return;
		this.clipboard = widgets.map((w) => w.copy());
	}

	cutSelectedWidgets(): void {
		if (this.getStoreState().selectedWidgetIds.length === 0) return;
		this.copySelectedWidgets();
		this.getStoreState().removeSelectedWidgets();
	}

	/** Colle sous le curseur quand il survole le canvas (comme le grafcet/ladder), sinon avec un
	 * décalage fixe depuis la position d'origine. */
	pasteWidgets(): void {
		if (!this.clipboard || this.clipboard.length === 0) return;

		const boundsLeft = Math.min(...this.clipboard.map((w) => w.position.x));
		const boundsTop = Math.min(...this.clipboard.map((w) => w.position.y));
		const boundsRight = Math.max(...this.clipboard.map((w) => w.position.x + w.size.width));
		const boundsBottom = Math.max(...this.clipboard.map((w) => w.position.y + w.size.height));

		const cursor = getLastMousePosition();
		const cursorCanvasPosition = this.getStoreState().screenToCanvasPosition?.(cursor.x, cursor.y) ?? null;

		let dx: number;
		let dy: number;
		if (cursorCanvasPosition) {
			const width = boundsRight - boundsLeft;
			const height = boundsBottom - boundsTop;
			const targetLeft = Math.max(0, Math.min(HMI_CANVAS_WIDTH - width, cursorCanvasPosition.x - width / 2));
			const targetTop = Math.max(0, Math.min(HMI_CANVAS_HEIGHT - height, cursorCanvasPosition.y - height / 2));
			dx = targetLeft - boundsLeft;
			dy = targetTop - boundsTop;
		} else {
			dx = PASTE_FALLBACK_OFFSET;
			dy = PASTE_FALLBACK_OFFSET;
		}

		// Préserve la hiérarchie relative du clipboard, pas ses écarts : les widgets collés
		// repartent groupés juste au-dessus du plus haut widget actuel de la page (ex. clipboard à
		// 5/9/10, widget le plus haut à 20 -> collés à 21/22/23).
		const baseStackOrder = HmiWidget.nextStackOrder(this.getStoreState().hmiPage.widgets);
		const stackOrderByOriginalId = new Map(
			[...this.clipboard]
				.sort((a, b) => a.stackOrder - b.stackOrder)
				.map((widget, i) => [widget.id, baseStackOrder + i] as const),
		);

		// Un widget collé ne peut pas garder le nom de son original (unicité par page, voir
		// `HmiWidgetBase.name`) — accumule au fil du collage pour que deux widgets du même type
		// collés ensemble ne reçoivent pas le même nom.
		const namingContext = [...this.getStoreState().hmiPage.widgets];
		const newWidgets = this.clipboard.map((widget) => {
			const x = Math.max(0, Math.min(HMI_CANVAS_WIDTH - widget.size.width, widget.position.x + dx));
			const y = Math.max(0, Math.min(HMI_CANVAS_HEIGHT - widget.size.height, widget.position.y + dy));
			const newWidget = HmiWidget.createInstance(
				createRandomId(),
				widget.type,
				HmiWidget.nextName(widget.type, namingContext),
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
		this.setStoreState(() => ({ selectedWidgetIds: newWidgets.map((w) => w.id) }));
		//Coller à nouveau décale depuis la position déjà collée, pas depuis l'original — sans quoi
		//des collages répétés au même endroit du canvas s'empileraient exactement.
		this.clipboard = newWidgets;
	}
}
