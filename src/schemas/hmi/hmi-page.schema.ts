import { createRandomId } from "@/ids";
import { HmiWidget, HmiWidgetData, HmiWidgetPosition, HmiWidgetSize } from "./hmi-widget.schema";

/** Dimensions fixes du canvas HMI, en pixels — multiples de `SNAP_GRID` (voir
 * `src/ui/components/hmi/view/constants.ts`) pour que les bords du canvas tombent sur la grille. */
export const HMI_CANVAS_WIDTH = 1000;
export const HMI_CANVAS_HEIGHT = 640;

/** Base du nom auto-généré ("Vue HMI_1", "Vue HMI_2"...) à la création — voir
 * `Project.nextHmiPageName`. */
export const HMI_PAGE_NAME_LABEL = "Vue HMI";

export default class HmiPage {
	id: string;
	name: string;
	widgets: HmiWidget[];
	/** Page affichée en premier par la vue simulation HMI (voir `HmiSimulationPageView`) — une
	 * seule page du projet à `true` à la fois, garanti par `Project.setMainHmiPage`, pas ici (une
	 * page ne connaît pas les autres). */
	isMain: boolean;

	constructor(id: string, name: string, isMain = false) {
		this.id = id;
		this.name = name;
		this.widgets = [];
		this.isMain = isMain;
	}

	addWidget(widget: HmiWidget): void {
		this.widgets.push(widget);
	}

	updateWidget(
		widgetId: string,
		partial: {
			name?: string;
			position?: HmiWidgetPosition;
			size?: HmiWidgetSize;
			stackOrder?: number;
			data?: Partial<HmiWidgetData>;
		},
	): void {
		const widget = this.widgets.find((w) => w.id === widgetId);
		if (!widget) return;
		if (partial.name !== undefined) widget.name = partial.name;
		if (partial.position !== undefined) widget.position = { ...partial.position };
		if (partial.size !== undefined) widget.size = { ...partial.size };
		if (partial.stackOrder !== undefined) widget.stackOrder = partial.stackOrder;
		// Fusion générique : `partial.data` peut porter des champs propres à n'importe quel type de
		// widget (voir `HmiStoreState.updateWidget`, seul appelant) — `widget.data` (union discriminée
		// par `widget.type`) ne peut pas être rétréci ici, où le type concret n'est pas connu.
		if (partial.data !== undefined) widget.data = { ...widget.data, ...partial.data } as typeof widget.data;
	}

	removeWidget(widgetId: string): void {
		this.widgets = this.widgets.filter((w) => w.id !== widgetId);
	}

	copy(): HmiPage {
		const copy = new HmiPage(this.id, this.name, this.isMain);
		copy.widgets = this.widgets.map((w) => w.copy());
		return copy;
	}

	/** @param isMain Absent : `false` — c'est `Project.createHmiPage` qui décide (première page du
	 * projet), pas cette factory générique. */
	static create(name: string, isMain = false): HmiPage {
		return new HmiPage(createRandomId(), name, isMain);
	}

	static createFromJSON(json: string): HmiPage {
		const raw = JSON.parse(json);
		const page = new HmiPage(raw.id, raw.name, raw.isMain ?? false);
		page.widgets = (raw.widgets ?? []).map((w: unknown) => HmiWidget.createFromJSON(JSON.stringify(w)));
		return page;
	}
}
