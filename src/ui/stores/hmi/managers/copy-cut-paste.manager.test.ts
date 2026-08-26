import CommandsStack from "@/schemas/commands/commands-stack.schema";
import HmiPage from "@/schemas/hmi/hmi-page.schema";
import { createHmiStore } from "../hmi.store";

function buildStore() {
	const page = HmiPage.create("Vue 1");
	return createHmiStore(page, new CommandsStack<HmiPage>(100));
}

describe("CopyCutPasteManager", () => {
	describe("copySelectedWidgets / pasteWidgets", () => {
		it("ne fait rien si rien n'est sélectionné", () => {
			const store = buildStore();
			store.getState().addWidget("push-button", 0, 0);
			store.getState().clearSelection();

			store.getState().copyCutPasteManager.copySelectedWidgets();
			store.getState().copyCutPasteManager.pasteWidgets();

			expect(store.getState().hmiPage.widgets).toHaveLength(1);
		});

		it("colle une copie du widget sélectionné, décalée, et la sélectionne", () => {
			const store = buildStore();
			const original = store.getState().addWidget("push-button", 10, 20);
			store.getState().selectWidget(original.id);

			store.getState().copyCutPasteManager.copySelectedWidgets();
			store.getState().copyCutPasteManager.pasteWidgets();

			const widgets = store.getState().hmiPage.widgets;
			expect(widgets).toHaveLength(2);
			const pasted = widgets.find((w) => w.id !== original.id)!;
			expect(pasted.type).toBe("push-button");
			expect(pasted.position).not.toEqual(original.position);
			expect(store.getState().selectedWidgetIds).toEqual([pasted.id]);
		});

		it("coller plusieurs fois décale à chaque fois depuis le dernier collage", () => {
			const store = buildStore();
			const original = store.getState().addWidget("indicator", 10, 20);
			store.getState().selectWidget(original.id);
			store.getState().copyCutPasteManager.copySelectedWidgets();

			store.getState().copyCutPasteManager.pasteWidgets();
			const firstPaste = store.getState().hmiPage.widgets.find((w) => w.id !== original.id)!;

			store.getState().copyCutPasteManager.pasteWidgets();
			const widgets = store.getState().hmiPage.widgets;
			expect(widgets).toHaveLength(3);
			const secondPaste = widgets.find((w) => w.id !== original.id && w.id !== firstPaste.id)!;
			expect(secondPaste.position).not.toEqual(firstPaste.position);
		});

		it("le collage est annulable en un seul geste", () => {
			const store = buildStore();
			const original = store.getState().addWidget("push-button", 10, 20);
			store.getState().selectWidget(original.id);
			store.getState().copyCutPasteManager.copySelectedWidgets();

			store.getState().copyCutPasteManager.pasteWidgets();
			expect(store.getState().hmiPage.widgets).toHaveLength(2);

			store.getState().commandsStackManager.undoOperation();
			expect(store.getState().hmiPage.widgets).toHaveLength(1);
		});
	});

	describe("pasteWidgets - stackOrder", () => {
		it("place le widget collé au premier plan", () => {
			const store = buildStore();
			const original = store.getState().addWidget("push-button", 10, 20);
			store.getState().addWidget("indicator", 50, 50); // stackOrder 1, le plus haut
			store.getState().selectWidget(original.id);

			store.getState().copyCutPasteManager.copySelectedWidgets();
			store.getState().copyCutPasteManager.pasteWidgets();

			const pasted = store.getState().hmiPage.widgets.find((w) => w.id !== original.id && w.type === "push-button")!;
			expect(pasted.stackOrder).toBe(2);
		});

		it("préserve la hiérarchie relative de plusieurs widgets collés, pas leurs écarts", () => {
			// Reproduit l'exemple de la spécification : clipboard à 5/9/10, plus haut stackOrder de
			// la page à 20 -> collés à 21/22/23, dans le même ordre relatif que les originaux (pas
			// celui de la sélection).
			const store = buildStore();
			const w5 = store.getState().addWidget("push-button", 0, 0);
			const w10 = store.getState().addWidget("indicator", 0, 0);
			const w9 = store.getState().addWidget("gauge", 0, 0);
			const wMax = store.getState().addWidget("numeric-input", 0, 0);
			store.getState().updateWidget(w5.id, { stackOrder: 5 });
			store.getState().updateWidget(w9.id, { stackOrder: 9 });
			store.getState().updateWidget(w10.id, { stackOrder: 10 });
			store.getState().updateWidget(wMax.id, { stackOrder: 20 });

			// Ordre de sélection volontairement différent de l'ordre par stackOrder.
			store.getState().setSelection([w10.id, w5.id, w9.id]);
			store.getState().copyCutPasteManager.copySelectedWidgets();
			store.getState().copyCutPasteManager.pasteWidgets();

			const widgets = store.getState().hmiPage.widgets;
			const pastedFrom = (original: { type: string }) =>
				widgets.find((w) => w.type === original.type && w.id !== w5.id && w.id !== w9.id && w.id !== w10.id)!;
			expect(pastedFrom(w5).stackOrder).toBe(21);
			expect(pastedFrom(w9).stackOrder).toBe(22);
			expect(pastedFrom(w10).stackOrder).toBe(23);
		});
	});

	describe("pasteWidgets - name", () => {
		it("attribue un nouveau nom unique à chaque widget collé, plutôt que de garder celui de l'original", () => {
			const store = buildStore();
			const w1 = store.getState().addWidget("rectangle", 0, 0);
			const w2 = store.getState().addWidget("rectangle", 0, 0);
			store.getState().setSelection([w1.id, w2.id]);

			store.getState().copyCutPasteManager.copySelectedWidgets();
			store.getState().copyCutPasteManager.pasteWidgets();

			const pastedNames = store
				.getState()
				.hmiPage.widgets.filter((w) => w.id !== w1.id && w.id !== w2.id)
				.map((w) => w.name)
				.sort();
			expect(pastedNames).toEqual(["Rectangle_3", "Rectangle_4"]);
		});
	});

	describe("cutSelectedWidgets", () => {
		it("copie puis retire les widgets sélectionnés", () => {
			const store = buildStore();
			const w1 = store.getState().addWidget("push-button", 0, 0);
			store.getState().selectWidget(w1.id);

			store.getState().copyCutPasteManager.cutSelectedWidgets();

			expect(store.getState().hmiPage.widgets).toHaveLength(0);

			store.getState().copyCutPasteManager.pasteWidgets();
			expect(store.getState().hmiPage.widgets).toHaveLength(1);
			expect(store.getState().hmiPage.widgets[0].type).toBe("push-button");
		});

		it("ne fait rien si rien n'est sélectionné", () => {
			const store = buildStore();
			store.getState().addWidget("push-button", 0, 0);
			store.getState().clearSelection();

			store.getState().copyCutPasteManager.cutSelectedWidgets();

			expect(store.getState().hmiPage.widgets).toHaveLength(1);
		});
	});

	describe("pasteWidgets avec position du curseur", () => {
		it("centre le collage sur la position convertie par screenToCanvasPosition quand disponible", () => {
			const store = buildStore();
			const original = store.getState().addWidget("push-button", 0, 0);
			store.getState().selectWidget(original.id);
			store.getState().copyCutPasteManager.copySelectedWidgets();
			store.getState().setScreenToCanvasPosition(() => ({ x: 400, y: 300 }));

			store.getState().copyCutPasteManager.pasteWidgets();

			const pasted = store.getState().hmiPage.widgets.find((w) => w.id !== original.id)!;
			const centerX = pasted.position.x + pasted.size.width / 2;
			const centerY = pasted.position.y + pasted.size.height / 2;
			expect(centerX).toBe(400);
			expect(centerY).toBe(300);
		});
	});
});
