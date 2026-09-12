import HmiPage from "./hmi-page.schema";
import { HmiWidget } from "./hmi-widget.schema";

function pageWithWidgets() {
	const page = HmiPage.create("Vue 1");
	const w1 = HmiWidget.create("push-button", 10, 20);
	const w2 = HmiWidget.create("indicator", 100, 200);
	if (w1.type !== "push-button") throw new Error("unreachable");
	if (w2.type !== "indicator") throw new Error("unreachable");
	page.addWidget(w1);
	page.addWidget(w2);
	return { page, w1, w2 };
}

describe("HmiPage", () => {
	describe("create", () => {
		it("génère un id non vide et applique le nom", () => {
			const page = HmiPage.create("Vue HMI");

			expect(page.id).toBeTruthy();
			expect(page.name).toBe("Vue HMI");
			expect(Object.keys(page.widgets)).toHaveLength(0);
		});
	});

	describe("addWidget / removeWidget", () => {
		it("ajoute un widget et le retire par id", () => {
			const { page, w1, w2 } = pageWithWidgets();

			expect(Object.keys(page.widgets)).toHaveLength(2);

			page.removeWidget(w1.id);

			expect(Object.keys(page.widgets)).toHaveLength(1);
			expect(Object.values(page.widgets)[0].id).toBe(w2.id);
		});

		it("removeWidget ignore un id inexistant", () => {
			const { page } = pageWithWidgets();

			expect(() => page.removeWidget("inconnu")).not.toThrow();
			expect(Object.keys(page.widgets)).toHaveLength(2);
		});
	});

	describe("updateWidget", () => {
		it("met à jour la position", () => {
			const { page, w1 } = pageWithWidgets();

			page.updateWidget(w1.id, { position: { x: 50, y: 60 } });

			expect(page.widgets[w1.id]!.position).toEqual({ x: 50, y: 60 });
		});

		it("met à jour la taille", () => {
			const { page, w1 } = pageWithWidgets();

			page.updateWidget(w1.id, { size: { width: 90, height: 100 } });

			expect(page.widgets[w1.id]!.size).toEqual({ width: 90, height: 100 });
		});

		it("met à jour les données partiellement", () => {
			const { page, w1 } = pageWithWidgets();

			page.updateWidget(w1.id, { data: { label: "BP1" } });

			const updated = page.widgets[w1.id]!;
			if (updated.type !== "push-button") throw new Error("unreachable");
			expect(updated.data.label).toBe("BP1");
			expect(updated.data.variable).toBe("");
		});

		it("ignore un id inexistant", () => {
			const { page } = pageWithWidgets();

			expect(() =>
				page.updateWidget("inconnu", { position: { x: 0, y: 0 } }),
			).not.toThrow();
		});
	});

	describe("copy", () => {
		it("produit une instance distincte avec les mêmes widgets", () => {
			const { page } = pageWithWidgets();

			const copy = page.copy();

			expect(copy).not.toBe(page);
			expect(copy.id).toBe(page.id);
			expect(copy.name).toBe(page.name);
			expect(Object.keys(copy.widgets)).toHaveLength(2);
		});

		it("les widgets copiés sont indépendants de l'original", () => {
			const { page, w1 } = pageWithWidgets();
			const copy = page.copy();

			page.removeWidget(w1.id);

			expect(Object.keys(copy.widgets)).toHaveLength(2);
		});
	});

	describe("createFromJSON", () => {
		it("reconstruit une page avec ses widgets", () => {
			const { page } = pageWithWidgets();
			const w1 = Object.values(page.widgets)[0];
			if (w1.type !== "push-button") throw new Error("unreachable");
			w1.data.label = "Mon bouton";

			const restored = HmiPage.createFromJSON(JSON.stringify(page));
			const restoredW1 = Object.values(restored.widgets)[0];
			if (restoredW1.type !== "push-button") throw new Error("unreachable");

			expect(restored.id).toBe(page.id);
			expect(restored.name).toBe(page.name);
			expect(Object.keys(restored.widgets)).toHaveLength(2);
			expect(restoredW1.data.label).toBe("Mon bouton");
		});

		it("tolère l'absence du champ widgets", () => {
			const raw = JSON.stringify({ id: "h1", name: "Vue" });

			const page = HmiPage.createFromJSON(raw);

			expect(Object.keys(page.widgets)).toHaveLength(0);
		});
	});
});
