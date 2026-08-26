import HmiPage from "../hmi-page.schema";
import { HmiWidget } from "../hmi-widget.schema";
import WidgetUpdateCommand from "./widget-update.command";

describe("WidgetUpdateCommand", () => {
	function pageWithWidget() {
		const page = HmiPage.create("Vue 1");
		const widget = HmiWidget.create("push-button", 10, 20);
		if (widget.type !== "push-button") throw new Error("unreachable");
		page.addWidget(widget);
		return { page, widget };
	}

	it("applique la nouvelle position, et l'annulation restaure la précédente", () => {
		const { page, widget } = pageWithWidget();
		const command = new WidgetUpdateCommand({
			widgetId: widget.id,
			position: { x: 100, y: 200 },
			previousPosition: { x: 10, y: 20 },
		});

		command.execute(page);

		expect(page.widgets[0].position).toEqual({ x: 100, y: 200 });

		command.cancel(page);

		expect(page.widgets[0].position).toEqual({ x: 10, y: 20 });
	});

	it("applique la nouvelle taille, et l'annulation restaure la précédente", () => {
		const { page, widget } = pageWithWidget();
		const command = new WidgetUpdateCommand({
			widgetId: widget.id,
			size: { width: 150, height: 80 },
			previousSize: { ...widget.size },
		});

		command.execute(page);

		expect(page.widgets[0].size).toEqual({ width: 150, height: 80 });

		command.cancel(page);

		expect(page.widgets[0].size).toEqual(widget.size);
	});

	it("applique les nouvelles données, et l'annulation restaure les précédentes", () => {
		const { page, widget } = pageWithWidget();
		const command = new WidgetUpdateCommand({
			widgetId: widget.id,
			data: { label: "Nouveau" },
			previousData: { label: widget.data.label },
		});

		command.execute(page);

		expect((page.widgets[0].data as { label: string }).label).toBe("Nouveau");

		command.cancel(page);

		expect((page.widgets[0].data as { label: string }).label).toBe(widget.data.label);
	});

	it("round-trip execute→cancel laisse la page inchangée", () => {
		const { page, widget } = pageWithWidget();
		const before = JSON.stringify(page);
		const command = new WidgetUpdateCommand({
			widgetId: widget.id,
			position: { x: 100, y: 200 },
			previousPosition: { x: 10, y: 20 },
			data: { label: "Nouveau" },
			previousData: { label: widget.data.label },
		});

		command.execute(page);
		command.cancel(page);

		expect(JSON.stringify(page)).toBe(before);
	});
});
