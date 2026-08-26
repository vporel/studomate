import { HmiWidget, HmiWidgetData, HmiWidgetPosition, HmiWidgetSize, HmiWidgetType } from "../hmi-widget.schema";
import HmiPage from "../hmi-page.schema";
import AbstractHmiCommand from "./abstract-hmi.command";

export default class WidgetAddCommand extends AbstractHmiCommand<{
	id: string;
	type: HmiWidgetType;
	name: string;
	position: HmiWidgetPosition;
	size: HmiWidgetSize;
	stackOrder: number;
	data: HmiWidgetData;
}> {
	getType(): string {
		return "hmi-widget-add";
	}

	execute(page: HmiPage): [page: HmiPage, isCommandValid: boolean] {
		page.addWidget(
			HmiWidget.createInstance(
				this.payload.id,
				this.payload.type,
				this.payload.name,
				this.payload.position,
				this.payload.size,
				this.payload.stackOrder,
				{ ...this.payload.data },
			),
		);
		return [page, true];
	}

	cancel(page: HmiPage): HmiPage {
		page.removeWidget(this.payload.id);
		return page;
	}
}
