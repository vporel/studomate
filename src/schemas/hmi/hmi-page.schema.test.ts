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

describe("HmiPage.renameVariableReferences", () => {
	function widget(type: "push-button" | "indicator" | "rectangle" | "text") {
		return HmiWidget.create(type, 0, 0);
	}

	it("renames the main binding of several widgets", () => {
		const page = HmiPage.create("P");
		const a = widget("push-button");
		const b = widget("indicator");
		(a.data as { variable: string }).variable = "old";
		(b.data as { variable: string }).variable = "old";
		page.addWidget(a);
		page.addWidget(b);
		page.renameVariableReferences({ old: "new" });
		expect((a.data as { variable: string }).variable).toBe("new");
		expect((b.data as { variable: string }).variable).toBe("new");
	});

	it("renames each animation variable", () => {
		const page = HmiPage.create("P");
		const w = widget("rectangle");
		if (w.type !== "rectangle") throw new Error("unreachable");
		w.data.animations = {
			position: { xVariable: "ax", yVariable: "ay" },
			style: { variable: "as", rows: [] },
		};
		page.addWidget(w);
		page.renameVariableReferences({ ax: "bx", ay: "by", as: "bs" });
		expect(w.data.animations).toEqual({
			position: { xVariable: "bx", yVariable: "by" },
			style: { variable: "bs", rows: [] },
		});
	});

	it("does not mutate animations shared with a copy", () => {
		const page = HmiPage.create("P");
		const w = widget("rectangle");
		if (w.type !== "rectangle") throw new Error("unreachable");
		w.data.animations = { position: { xVariable: "ax" } };
		page.addWidget(w);
		const copy = page.copy();
		copy.renameVariableReferences({ ax: "bx" });
		expect(w.data.animations).toEqual({ position: { xVariable: "ax" } });
	});

	it("changes nothing when no key matches", () => {
		const page = HmiPage.create("P");
		const w = widget("push-button");
		if (w.type !== "push-button") throw new Error("unreachable");
		w.data.variable = "keep";
		w.data.animations = { position: { xVariable: "keep" } };
		page.addWidget(w);
		const before = structuredClone(w.data);
		page.renameVariableReferences({ other: "x" });
		expect(w.data).toEqual(before);
	});

	it("leaves widgets without binding untouched", () => {
		const page = HmiPage.create("P");
		const t = widget("text");
		page.addWidget(t);
		const before = structuredClone(t.data);
		page.renameVariableReferences({ old: "new" });
		expect(t.data).toEqual(before);
	});
});
