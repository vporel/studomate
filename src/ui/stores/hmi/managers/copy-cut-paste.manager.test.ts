import CommandsStack from "@/schemas/commands/commands-stack.schema";
import HmiPage from "@/schemas/hmi/hmi-page.schema";
import {
	clearClipboard,
	setClipboardEntry,
} from "@/ui/stores/shared/clipboard.store";
import { createHmiStore } from "../hmi.store";

function buildStore() {
	const page = HmiPage.create("Vue 1");
	return createHmiStore(page, new CommandsStack<HmiPage>(100));
}

describe("HmiCopyCutPasteManager", () => {
	beforeEach(() => clearClipboard());

	describe("copySelectedElements / pasteElements", () => {
		it("ne fait rien si rien n'est sélectionné", () => {
			const store = buildStore();
			store.getState().addWidget("push-button", 0, 0);
			store.getState().clearSelection();

			store.getState().copyCutPasteManager.copySelectedElements();
			store.getState().copyCutPasteManager.pasteElements();

			expect(Object.values(store.getState().hmiPage.widgets)).toHaveLength(1);
		});

		it("colle une copie du widget sélectionné, décalée, et la sélectionne", () => {
			const store = buildStore();
			const original = store.getState().addWidget("push-button", 10, 20);
			store.getState().selectWidget(original.id);

			store.getState().copyCutPasteManager.copySelectedElements();
			store.getState().copyCutPasteManager.pasteElements();

			const widgets = Object.values(store.getState().hmiPage.widgets);
			expect(widgets).toHaveLength(2);
			const pasted = widgets.find((w) => w.id !== original.id)!;
			expect(pasted.type).toBe("push-button");
			expect(pasted.position).not.toEqual(original.position);
			expect(store.getState().selectedWidgetIds).toEqual([pasted.id]);
		});

		it("colle sur la grille même quand le curseur tombe entre deux mailles", () => {
			const store = buildStore();
			const original = store.getState().addWidget("push-button", 100, 100);
			store.getState().selectWidget(original.id);
			store.getState().copyCutPasteManager.copySelectedElements();
			store
				.getState()
				.setScreenToCanvasPosition(() => ({ x: 313, y: 247 }));

			store
				.getState()
				.copyCutPasteManager.pasteElements({ x: 0, y: 0 });

			const pasted = Object.values(store.getState().hmiPage.widgets).find(
				(w) => w.id !== original.id,
			)!;
			expect(pasted.position.x % 10).toBe(0);
			expect(pasted.position.y % 10).toBe(0);
		});

		it("colle sur la grille même si l'original a été placé hors grille (panneau Propriétés)", () => {
			const store = buildStore();
			const original = store.getState().addWidget("push-button", 100, 100);
			// Saisie manuelle dans le panneau Propriétés : pas d'accrochage à la grille.
			store
				.getState()
				.updateWidget(original.id, { position: { x: 103, y: 107 } });
			store.getState().selectWidget(original.id);
			store.getState().copyCutPasteManager.copySelectedElements();

			store.getState().copyCutPasteManager.pasteElements();

			const pasted = Object.values(store.getState().hmiPage.widgets).find(
				(w) => w.id !== original.id,
			)!;
			expect(pasted.position.x % 10).toBe(0);
			expect(pasted.position.y % 10).toBe(0);
		});

		it("coller plusieurs fois décale à chaque fois depuis le dernier collage", () => {
			const store = buildStore();
			const original = store.getState().addWidget("indicator", 10, 20);
			store.getState().selectWidget(original.id);
			store.getState().copyCutPasteManager.copySelectedElements();

			store.getState().copyCutPasteManager.pasteElements();
			const firstPaste = Object.values(store.getState().hmiPage.widgets).find(
				(w) => w.id !== original.id,
			)!;

			store.getState().copyCutPasteManager.pasteElements();
			const widgets = Object.values(store.getState().hmiPage.widgets);
			expect(widgets).toHaveLength(3);
			const secondPaste = widgets.find(
				(w) => w.id !== original.id && w.id !== firstPaste.id,
			)!;
			expect(secondPaste.position).not.toEqual(firstPaste.position);
		});

		it("le collage est annulable en un seul geste", () => {
			const store = buildStore();
			const original = store.getState().addWidget("push-button", 10, 20);
			store.getState().selectWidget(original.id);
			store.getState().copyCutPasteManager.copySelectedElements();

			store.getState().copyCutPasteManager.pasteElements();
			expect(Object.values(store.getState().hmiPage.widgets)).toHaveLength(2);

			store.getState().commandsStackManager.undoOperation();
			expect(Object.values(store.getState().hmiPage.widgets)).toHaveLength(1);
		});
	});

	describe("pasteElements - stackOrder", () => {
		it("place le widget collé au premier plan", () => {
			const store = buildStore();
			const original = store.getState().addWidget("push-button", 10, 20);
			store.getState().addWidget("indicator", 50, 50); // stackOrder 1, le plus haut
			store.getState().selectWidget(original.id);

			store.getState().copyCutPasteManager.copySelectedElements();
			store.getState().copyCutPasteManager.pasteElements();

			const pasted = Object.values(store.getState().hmiPage.widgets).find(
				(w) => w.id !== original.id && w.type === "push-button",
			)!;
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
			store.getState().copyCutPasteManager.copySelectedElements();
			store.getState().copyCutPasteManager.pasteElements();

			const widgets = Object.values(store.getState().hmiPage.widgets);
			const pastedFrom = (original: { type: string }) =>
				widgets.find(
					(w) =>
						w.type === original.type &&
						w.id !== w5.id &&
						w.id !== w9.id &&
						w.id !== w10.id,
				)!;
			expect(pastedFrom(w5).stackOrder).toBe(21);
			expect(pastedFrom(w9).stackOrder).toBe(22);
			expect(pastedFrom(w10).stackOrder).toBe(23);
		});
	});

	describe("pasteElements - name", () => {
		it("attribue un nouveau nom unique à chaque widget collé, plutôt que de garder celui de l'original", () => {
			const store = buildStore();
			const w1 = store.getState().addWidget("rectangle", 0, 0);
			const w2 = store.getState().addWidget("rectangle", 0, 0);
			store.getState().setSelection([w1.id, w2.id]);

			store.getState().copyCutPasteManager.copySelectedElements();
			store.getState().copyCutPasteManager.pasteElements();

			const pastedNames = Object.values(store.getState().hmiPage.widgets)
				.filter((w) => w.id !== w1.id && w.id !== w2.id)
				.map((w) => w.name)
				.sort();
			expect(pastedNames).toEqual(["Rectangle_3", "Rectangle_4"]);
		});

		it("suffixe le nom de l'original plutôt que de repartir du label du type", () => {
			const store = buildStore();
			const w = store.getState().addWidget("rectangle", 0, 0);
			store.getState().updateWidget(w.id, { name: "Cadre_titre" });
			store.getState().selectWidget(w.id);

			store.getState().copyCutPasteManager.copySelectedElements();
			store.getState().copyCutPasteManager.pasteElements();

			const pasted = Object.values(store.getState().hmiPage.widgets).find(
				(x) => x.id !== w.id,
			)!;
			expect(pasted.name).toBe("Cadre_titre_2");
		});
	});

	describe("cutSelectedElements", () => {
		it("copie puis retire les widgets sélectionnés", () => {
			const store = buildStore();
			const w1 = store.getState().addWidget("push-button", 0, 0);
			store.getState().selectWidget(w1.id);

			store.getState().copyCutPasteManager.cutSelectedElements();

			expect(Object.values(store.getState().hmiPage.widgets)).toHaveLength(0);

			store.getState().copyCutPasteManager.pasteElements();
			expect(Object.values(store.getState().hmiPage.widgets)).toHaveLength(1);
			expect(Object.values(store.getState().hmiPage.widgets)[0].type).toBe(
				"push-button",
			);
		});

		it("ne fait rien si rien n'est sélectionné", () => {
			const store = buildStore();
			store.getState().addWidget("push-button", 0, 0);
			store.getState().clearSelection();

			store.getState().copyCutPasteManager.cutSelectedElements();

			expect(Object.values(store.getState().hmiPage.widgets)).toHaveLength(1);
		});
	});

	describe("pasteElements avec position du curseur", () => {
		it("centre le collage sur la position convertie par screenToCanvasPosition, accroché à la grille", () => {
			const store = buildStore();
			const original = store.getState().addWidget("push-button", 0, 0);
			store.getState().selectWidget(original.id);
			store.getState().copyCutPasteManager.copySelectedElements();
			store.getState().setScreenToCanvasPosition(() => ({ x: 400, y: 300 }));

			store.getState().copyCutPasteManager.pasteElements();

			const pasted = Object.values(store.getState().hmiPage.widgets).find(
				(w) => w.id !== original.id,
			)!;
			expect(pasted.position.x % 10).toBe(0);
			expect(pasted.position.y % 10).toBe(0);
			const centerX = pasted.position.x + pasted.size.width / 2;
			const centerY = pasted.position.y + pasted.size.height / 2;
			expect(Math.abs(centerX - 400)).toBeLessThanOrEqual(5);
			expect(Math.abs(centerY - 300)).toBeLessThanOrEqual(5);
		});
	});

	describe("presse-papiers partagé entre pages", () => {
		it("colle dans une autre page HMI ce qui a été copié dans la première", () => {
			const pageA = createHmiStore(
				HmiPage.create("Vue A"),
				new CommandsStack<HmiPage>(100),
			);
			const pageB = createHmiStore(
				HmiPage.create("Vue B"),
				new CommandsStack<HmiPage>(100),
			);
			const original = pageA.getState().addWidget("push-button", 10, 20);
			pageA.getState().selectWidget(original.id);
			pageA.getState().copyCutPasteManager.copySelectedElements();

			pageB.getState().copyCutPasteManager.pasteElements();

			const widgetsB = Object.values(pageB.getState().hmiPage.widgets);
			expect(widgetsB).toHaveLength(1);
			expect(widgetsB[0].type).toBe("push-button");
			expect(Object.values(pageA.getState().hmiPage.widgets)).toHaveLength(1);
		});

		it("ne colle rien si le presse-papiers vient d'un autre type de page", () => {
			const store = buildStore();
			store.getState().addWidget("push-button", 0, 0);
			// Presse-papiers rempli par une autre couche (grafcet).
			setClipboardEntry({ scope: "grafcet", data: { nodes: [], edges: [] } });

			store.getState().copyCutPasteManager.pasteElements();

			expect(Object.values(store.getState().hmiPage.widgets)).toHaveLength(1);
		});

		it("ne colle rien après vidage du presse-papiers (changement de projet)", () => {
			const store = buildStore();
			const original = store.getState().addWidget("push-button", 0, 0);
			store.getState().selectWidget(original.id);
			store.getState().copyCutPasteManager.copySelectedElements();

			clearClipboard();
			store.getState().copyCutPasteManager.pasteElements();

			expect(Object.values(store.getState().hmiPage.widgets)).toHaveLength(1);
		});
	});
});
