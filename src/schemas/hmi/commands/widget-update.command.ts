import {
	HmiWidgetData,
	HmiWidgetPosition,
	HmiWidgetSize,
} from "../hmi-widget.schema";
import HmiPage from "../hmi-page.schema";
import AbstractHmiCommand from "./abstract-hmi.command";

/**
 * Met à jour un widget — nom, position, taille, ordre d'empilement et/ou données, chacun
 * optionnel. Fournir un champ exige de fournir aussi son `previous*` correspondant, seul moyen
 * d'annuler la commande.
 */
export default class WidgetUpdateCommand extends AbstractHmiCommand<{
	widgetId: string;
	name?: string;
	previousName?: string;
	position?: HmiWidgetPosition;
	previousPosition?: HmiWidgetPosition;
	size?: HmiWidgetSize;
	previousSize?: HmiWidgetSize;
	stackOrder?: number;
	previousStackOrder?: number;
	data?: Partial<HmiWidgetData>;
	previousData?: Partial<HmiWidgetData>;
}> {
	getType(): string {
		return "hmi-widget-update";
	}

	execute(page: HmiPage): [page: HmiPage, isCommandValid: boolean] {
		page.updateWidget(this.payload.widgetId, {
			name: this.payload.name,
			position: this.payload.position,
			size: this.payload.size,
			stackOrder: this.payload.stackOrder,
			data: this.payload.data,
		});
		return [page, true];
	}

	cancel(page: HmiPage): HmiPage {
		page.updateWidget(this.payload.widgetId, {
			name: this.payload.previousName,
			position: this.payload.previousPosition,
			size: this.payload.previousSize,
			stackOrder: this.payload.previousStackOrder,
			data: this.payload.previousData,
		});
		return page;
	}
}
