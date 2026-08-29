import HmiPage from "../hmi-page.schema";
import WidgetAddCommand from "./widget-add.command";

describe("WidgetAddCommand", () => {
	function payload() {
		return {
			id: "w1",
			type: "push-button" as const,
			name: "Bouton poussoir_1",
			position: { x: 10, y: 20 },
			size: { width: 90, height: 40 },
			stackOrder: 0,
			data: { variable: "", label: "BP1" },
		};
	}

	it("ajoute le widget, et l'annulation le retire", () => {
		const page = HmiPage.create("Vue 1");
		const command = new WidgetAddCommand(payload());

		command.execute(page);

		expect(Object.keys(page.widgets)).toHaveLength(1);
		expect(Object.values(page.widgets)[0]).toMatchObject({
			id: "w1",
			type: "push-button",
		});

		command.cancel(page);

		expect(Object.keys(page.widgets)).toHaveLength(0);
	});

	it("round-trip execute→cancel laisse la page inchangée", () => {
		const page = HmiPage.create("Vue 1");
		const before = JSON.stringify(page);
		const command = new WidgetAddCommand(payload());

		command.execute(page);
		command.cancel(page);

		expect(JSON.stringify(page)).toBe(before);
	});
});
