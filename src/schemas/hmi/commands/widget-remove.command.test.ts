import HmiPage from "../hmi-page.schema";
import { HmiWidget } from "../hmi-widget.schema";
import WidgetRemoveCommand from "./widget-remove.command";

describe("WidgetRemoveCommand", () => {
	function pageWithWidget() {
		const page = HmiPage.create("Vue 1");
		const widget = HmiWidget.create("indicator", 10, 20);
		if (widget.type !== "indicator") throw new Error("unreachable");
		widget.data.label = "Voyant 1";
		page.addWidget(widget);
		return { page, widget };
	}

	it("retire le widget, et l'annulation le restaure à l'identique", () => {
		const { page, widget } = pageWithWidget();
		const command = new WidgetRemoveCommand({
			id: widget.id,
			type: widget.type,
			name: widget.name,
			position: widget.position,
			size: widget.size,
			stackOrder: widget.stackOrder,
			data: widget.data,
		});

		command.execute(page);

		expect(Object.keys(page.widgets)).toHaveLength(0);

		command.cancel(page);

		expect(Object.keys(page.widgets)).toHaveLength(1);
		expect(Object.values(page.widgets)[0]).toMatchObject({
			id: widget.id,
			type: "indicator",
			data: { label: "Voyant 1" },
		});
	});

	it("round-trip execute→cancel laisse la page inchangée", () => {
		const { page, widget } = pageWithWidget();
		const before = JSON.stringify(page);
		const command = new WidgetRemoveCommand({
			id: widget.id,
			type: widget.type,
			name: widget.name,
			position: widget.position,
			size: widget.size,
			stackOrder: widget.stackOrder,
			data: widget.data,
		});

		command.execute(page);
		command.cancel(page);

		expect(JSON.stringify(page)).toBe(before);
	});
});
