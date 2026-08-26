import CommandsStack from "@/schemas/commands/commands-stack.schema";
import HmiPage from "@/schemas/hmi/hmi-page.schema";
import { createHmiStore } from "./hmi.store";

function buildStore() {
	const page = HmiPage.create("Vue 1");
	return createHmiStore(page, new CommandsStack<HmiPage>(100));
}

describe("hmi.store", () => {
	describe("addWidget", () => {
		it("ajoute le widget, le sélectionne et active l'annulation", () => {
			const store = buildStore();

			store.getState().addWidget("push-button", 10, 20);

			const state = store.getState();
			expect(state.hmiPage.widgets).toHaveLength(1);
			expect(state.selectedWidgetIds).toEqual([state.hmiPage.widgets[0].id]);
			expect(state.hasCommandsToUndo).toBe(true);
			expect(state.hasCommandsToRedo).toBe(false);
		});
	});

	describe("sélection", () => {
		it("toggleWidgetSelection ajoute puis retire un widget de la sélection", () => {
			const store = buildStore();
			const w1 = store.getState().addWidget("push-button", 0, 0);
			const w2 = store.getState().addWidget("indicator", 50, 50);
			store.getState().selectWidget(w1.id);

			store.getState().toggleWidgetSelection(w2.id);
			expect(store.getState().selectedWidgetIds.sort()).toEqual([w1.id, w2.id].sort());

			store.getState().toggleWidgetSelection(w2.id);
			expect(store.getState().selectedWidgetIds).toEqual([w1.id]);
		});

		it("selectAllWidgets sélectionne tous les widgets de la page", () => {
			const store = buildStore();
			store.getState().addWidget("push-button", 0, 0);
			store.getState().addWidget("indicator", 50, 50);

			store.getState().selectAllWidgets();

			expect(store.getState().selectedWidgetIds).toHaveLength(2);
		});

		it("clearSelection vide la sélection", () => {
			const store = buildStore();
			store.getState().addWidget("push-button", 0, 0);

			store.getState().clearSelection();

			expect(store.getState().selectedWidgetIds).toEqual([]);
		});
	});

	describe("updateWidget", () => {
		it("met à jour la position et l'annulation la restaure", () => {
			const store = buildStore();
			store.getState().addWidget("push-button", 10, 20);
			const widgetId = store.getState().hmiPage.widgets[0].id;

			store.getState().updateWidget(widgetId, { position: { x: 100, y: 200 } });

			expect(store.getState().hmiPage.widgets[0].position).toEqual({ x: 100, y: 200 });

			store.getState().commandsStackManager.undoOperation();

			expect(store.getState().hmiPage.widgets[0].position).toEqual({ x: 10, y: 20 });
		});

		it("met à jour les données partiellement sans affecter les autres champs au retour arrière", () => {
			const store = buildStore();
			store.getState().addWidget("gauge", 0, 0);
			const widgetId = store.getState().hmiPage.widgets[0].id;

			store.getState().updateWidget(widgetId, { data: { label: "Vitesse" } });
			store.getState().updateWidget(widgetId, { data: { min: 10 } });

			expect(store.getState().hmiPage.widgets[0].data).toMatchObject({ label: "Vitesse", min: 10, max: 100 });

			store.getState().commandsStackManager.undoOperation();

			expect(store.getState().hmiPage.widgets[0].data).toMatchObject({ label: "Vitesse", min: 0, max: 100 });
		});
	});

	describe("moveWidgets", () => {
		it("déplace plusieurs widgets du même delta en une seule commande annulable", () => {
			const store = buildStore();
			const w1 = store.getState().addWidget("push-button", 0, 0);
			const w2 = store.getState().addWidget("indicator", 100, 100);

			store.getState().moveWidgets([w1.id, w2.id], 10, 20);

			expect(store.getState().hmiPage.widgets.find((w) => w.id === w1.id)!.position).toEqual({ x: 10, y: 20 });
			expect(store.getState().hmiPage.widgets.find((w) => w.id === w2.id)!.position).toEqual({ x: 110, y: 120 });

			store.getState().commandsStackManager.undoOperation();

			expect(store.getState().hmiPage.widgets.find((w) => w.id === w1.id)!.position).toEqual({ x: 0, y: 0 });
			expect(store.getState().hmiPage.widgets.find((w) => w.id === w2.id)!.position).toEqual({ x: 100, y: 100 });
		});

		it("ne fait rien pour un delta nul", () => {
			const store = buildStore();
			const w1 = store.getState().addWidget("push-button", 0, 0);
			const before = store.getState().hasCommandsToUndo;

			store.getState().moveWidgets([w1.id], 0, 0);

			expect(store.getState().hasCommandsToUndo).toBe(before);
		});
	});

	describe("alignSelectedWidgets", () => {
		function twoWidgetsAtDifferentHeights(store: ReturnType<typeof buildStore>) {
			const top = store.getState().addWidget("push-button", 0, 0);
			const bottom = store.getState().addWidget("push-button", 200, 100);
			store.getState().updateWidget(top.id, { size: { width: 90, height: 40 } });
			store.getState().updateWidget(bottom.id, { size: { width: 90, height: 60 } });
			store.getState().selectAllWidgets();
			return { top, bottom };
		}

		function positionOf(store: ReturnType<typeof buildStore>, widgetId: string) {
			return store.getState().hmiPage.widgets.find((w) => w.id === widgetId)!.position;
		}

		it("ne fait rien à moins de deux widgets sélectionnés", () => {
			const store = buildStore();
			const w1 = store.getState().addWidget("push-button", 0, 0);
			store.getState().selectWidget(w1.id);
			const before = store.getState().hasCommandsToUndo;

			store.getState().alignSelectedWidgets("top");

			expect(store.getState().hasCommandsToUndo).toBe(before);
		});

		it("vers le haut : tous les widgets prennent le y du plus haut", () => {
			const store = buildStore();
			const { top, bottom } = twoWidgetsAtDifferentHeights(store);

			store.getState().alignSelectedWidgets("top");

			expect(positionOf(store, top.id).y).toBe(0);
			expect(positionOf(store, bottom.id).y).toBe(0);
		});

		it("vers le bas : les bords bas s'alignent sur celui du widget le plus bas", () => {
			const store = buildStore();
			const { top, bottom } = twoWidgetsAtDifferentHeights(store);

			store.getState().alignSelectedWidgets("bottom");

			// Bord bas de référence : 100 (y du plus bas) + 60 (sa hauteur) = 160.
			expect(positionOf(store, bottom.id).y).toBe(100);
			expect(positionOf(store, top.id).y).toBe(120); // 160 - 40
		});

		it("au centre vertical : chaque widget est centré sur le milieu de l'étendue totale", () => {
			const store = buildStore();
			const { top, bottom } = twoWidgetsAtDifferentHeights(store);

			store.getState().alignSelectedWidgets("center-vertical");

			// Milieu : (0 + 160) / 2 = 80.
			expect(positionOf(store, top.id).y).toBe(60); // 80 - 40/2
			expect(positionOf(store, bottom.id).y).toBe(50); // 80 - 60/2
		});

		it("arrondit le résultat à la dizaine la plus proche", () => {
			const store = buildStore();
			const top = store.getState().addWidget("push-button", 0, 0);
			const bottom = store.getState().addWidget("push-button", 0, 100);
			store.getState().updateWidget(top.id, { size: { width: 90, height: 33 } });
			store.getState().updateWidget(bottom.id, { size: { width: 90, height: 45 } });
			store.getState().selectAllWidgets();

			store.getState().alignSelectedWidgets("bottom");

			// Bord bas de référence : 100 + 45 = 145 ; y de `top` = 145 - 33 = 112, arrondi à 110.
			expect(positionOf(store, top.id).y).toBe(110);
		});

		it("annule en une seule commande", () => {
			const store = buildStore();
			const { top, bottom } = twoWidgetsAtDifferentHeights(store);

			store.getState().alignSelectedWidgets("top");
			store.getState().commandsStackManager.undoOperation();

			expect(positionOf(store, top.id)).toEqual({ x: 0, y: 0 });
			expect(positionOf(store, bottom.id)).toEqual({ x: 200, y: 100 });
		});

		// Même logique que sur y, rapportée à x — voir `HmiStoreState.alignSelectedWidgets`.
		function twoWidgetsAtDifferentWidths(store: ReturnType<typeof buildStore>) {
			const left = store.getState().addWidget("push-button", 0, 0);
			const right = store.getState().addWidget("push-button", 100, 200);
			store.getState().updateWidget(left.id, { size: { width: 40, height: 40 } });
			store.getState().updateWidget(right.id, { size: { width: 60, height: 40 } });
			store.getState().selectAllWidgets();
			return { left, right };
		}

		it("à gauche : tous les widgets prennent le x du plus à gauche", () => {
			const store = buildStore();
			const { left, right } = twoWidgetsAtDifferentWidths(store);

			store.getState().alignSelectedWidgets("left");

			expect(positionOf(store, left.id).x).toBe(0);
			expect(positionOf(store, right.id).x).toBe(0);
			// L'axe non concerné (y) est laissé intact.
			expect(positionOf(store, left.id).y).toBe(0);
			expect(positionOf(store, right.id).y).toBe(200);
		});

		it("à droite : les bords droits s'alignent sur celui du widget le plus à droite", () => {
			const store = buildStore();
			const { left, right } = twoWidgetsAtDifferentWidths(store);

			store.getState().alignSelectedWidgets("right");

			// Bord droit de référence : 100 (x du plus à droite) + 60 (sa largeur) = 160.
			expect(positionOf(store, right.id).x).toBe(100);
			expect(positionOf(store, left.id).x).toBe(120); // 160 - 40
		});

		it("au centre horizontal : chaque widget est centré sur le milieu de l'étendue totale", () => {
			const store = buildStore();
			const { left, right } = twoWidgetsAtDifferentWidths(store);

			store.getState().alignSelectedWidgets("center-horizontal");

			// Milieu : (0 + 160) / 2 = 80.
			expect(positionOf(store, left.id).x).toBe(60); // 80 - 40/2
			expect(positionOf(store, right.id).x).toBe(50); // 80 - 60/2
		});
	});

	describe("removeSelectedWidgets", () => {
		it("retire les widgets sélectionnés et l'annulation les restaure à l'identique, en une seule commande", () => {
			const store = buildStore();
			const w1 = store.getState().addWidget("indicator", 5, 5);
			const w2 = store.getState().addWidget("push-button", 50, 50);
			store.getState().selectAllWidgets();

			store.getState().removeSelectedWidgets();

			expect(store.getState().hmiPage.widgets).toHaveLength(0);
			expect(store.getState().selectedWidgetIds).toEqual([]);

			store.getState().commandsStackManager.undoOperation();

			expect(store.getState().hmiPage.widgets.map((w) => w.id).sort()).toEqual([w1.id, w2.id].sort());
		});

		it("ne fait rien si aucun widget n'est sélectionné", () => {
			const store = buildStore();

			expect(() => store.getState().removeSelectedWidgets()).not.toThrow();
			expect(store.getState().hmiPage.widgets).toHaveLength(0);
		});
	});

	describe("addWidget - stackOrder", () => {
		it("place chaque nouveau widget au premier plan", () => {
			const store = buildStore();

			const w1 = store.getState().addWidget("push-button", 0, 0);
			const w2 = store.getState().addWidget("indicator", 0, 0);
			const w3 = store.getState().addWidget("gauge", 0, 0);

			expect(w1.stackOrder).toBe(0);
			expect(w2.stackOrder).toBe(1);
			expect(w3.stackOrder).toBe(2);
		});
	});

	describe("addWidget - name", () => {
		it("génère un nom unique par type au format Label_N", () => {
			const store = buildStore();

			const w1 = store.getState().addWidget("rectangle", 0, 0);
			const w2 = store.getState().addWidget("rectangle", 0, 0);
			const w3 = store.getState().addWidget("ellipse", 0, 0);

			expect(w1.name).toBe("Rectangle_1");
			expect(w2.name).toBe("Rectangle_2");
			expect(w3.name).toBe("Ellipse_1");
		});
	});

	describe("updateWidget - name", () => {
		it("renomme le widget, et l'annulation restaure le nom précédent", () => {
			const store = buildStore();
			const w1 = store.getState().addWidget("push-button", 0, 0);

			store.getState().updateWidget(w1.id, { name: "Départ moteur" });

			expect(store.getState().hmiPage.widgets[0].name).toBe("Départ moteur");

			store.getState().commandsStackManager.undoOperation();

			expect(store.getState().hmiPage.widgets[0].name).toBe("Bouton poussoir_1");
		});

		it("ignore un nom vide et n'empile aucune commande", () => {
			const store = buildStore();
			const w1 = store.getState().addWidget("push-button", 0, 0);
			const before = store.getState().hasCommandsToUndo;

			store.getState().updateWidget(w1.id, { name: "   " });

			expect(store.getState().hmiPage.widgets[0].name).toBe("Bouton poussoir_1");
			expect(store.getState().hasCommandsToUndo).toBe(before);
		});

		it("ignore un nom déjà pris par un autre widget de la page", () => {
			const store = buildStore();
			const w1 = store.getState().addWidget("push-button", 0, 0);
			store.getState().addWidget("indicator", 0, 0);

			store.getState().updateWidget(w1.id, { name: "Voyant_1" });

			expect(store.getState().hmiPage.widgets.find((w) => w.id === w1.id)!.name).toBe("Bouton poussoir_1");
		});
	});

	describe("bringForward / sendBackward", () => {
		it("échange le stackOrder avec le voisin immédiatement au-dessus, et l'annulation restaure", () => {
			const store = buildStore();
			const w1 = store.getState().addWidget("push-button", 0, 0);
			const w2 = store.getState().addWidget("indicator", 0, 0);

			store.getState().bringForward(w1.id);

			const widgets = () => store.getState().hmiPage.widgets;
			expect(widgets().find((w) => w.id === w1.id)!.stackOrder).toBe(1);
			expect(widgets().find((w) => w.id === w2.id)!.stackOrder).toBe(0);

			store.getState().commandsStackManager.undoOperation();

			expect(widgets().find((w) => w.id === w1.id)!.stackOrder).toBe(0);
			expect(widgets().find((w) => w.id === w2.id)!.stackOrder).toBe(1);
		});

		it("ne fait rien si le widget est déjà au premier plan", () => {
			const store = buildStore();
			const w1 = store.getState().addWidget("push-button", 0, 0);
			store.getState().addWidget("indicator", 0, 0);
			const before = store.getState().hasCommandsToUndo;

			store.getState().bringForward(store.getState().hmiPage.widgets[1].id);

			expect(store.getState().hasCommandsToUndo).toBe(before);
			expect(w1.stackOrder).toBe(0);
		});

		it("sendBackward échange avec le voisin immédiatement en dessous", () => {
			const store = buildStore();
			const w1 = store.getState().addWidget("push-button", 0, 0);
			const w2 = store.getState().addWidget("indicator", 0, 0);

			store.getState().sendBackward(w2.id);

			const widgets = store.getState().hmiPage.widgets;
			expect(widgets.find((w) => w.id === w1.id)!.stackOrder).toBe(1);
			expect(widgets.find((w) => w.id === w2.id)!.stackOrder).toBe(0);
		});

		it("ne fait rien si le widget est déjà en arrière-plan", () => {
			const store = buildStore();
			const w1 = store.getState().addWidget("push-button", 0, 0);
			store.getState().addWidget("indicator", 0, 0);
			const before = store.getState().hasCommandsToUndo;

			store.getState().sendBackward(w1.id);

			expect(store.getState().hasCommandsToUndo).toBe(before);
		});
	});

	describe("bringToFront / sendToBack", () => {
		it("place le widget au premier plan et décale ceux qui étaient au-dessus, sans changer les autres", () => {
			const store = buildStore();
			const w1 = store.getState().addWidget("push-button", 0, 0);
			const w2 = store.getState().addWidget("indicator", 0, 0);
			const w3 = store.getState().addWidget("gauge", 0, 0);
			const w4 = store.getState().addWidget("numeric-input", 0, 0);

			store.getState().bringToFront(w2.id);

			const widgets = store.getState().hmiPage.widgets;
			expect(widgets.find((w) => w.id === w1.id)!.stackOrder).toBe(0);
			expect(widgets.find((w) => w.id === w3.id)!.stackOrder).toBe(1);
			expect(widgets.find((w) => w.id === w4.id)!.stackOrder).toBe(2);
			expect(widgets.find((w) => w.id === w2.id)!.stackOrder).toBe(3);
		});

		it("sendToBack place le widget en arrière-plan et décale ceux qui étaient en dessous", () => {
			const store = buildStore();
			const w1 = store.getState().addWidget("push-button", 0, 0);
			const w2 = store.getState().addWidget("indicator", 0, 0);
			const w3 = store.getState().addWidget("gauge", 0, 0);

			store.getState().sendToBack(w3.id);

			const widgets = store.getState().hmiPage.widgets;
			expect(widgets.find((w) => w.id === w3.id)!.stackOrder).toBe(0);
			expect(widgets.find((w) => w.id === w1.id)!.stackOrder).toBe(1);
			expect(widgets.find((w) => w.id === w2.id)!.stackOrder).toBe(2);
		});
	});

	describe("cycle complet", () => {
		it("exécuter → annuler → rétablir redonne le même résultat", () => {
			const store = buildStore();
			store.getState().addWidget("push-button", 0, 0);
			const widgetId = store.getState().hmiPage.widgets[0].id;
			store.getState().updateWidget(widgetId, { position: { x: 50, y: 60 } });

			store.getState().commandsStackManager.undoOperation();
			store.getState().commandsStackManager.redoOperation();

			expect(store.getState().hmiPage.widgets[0].position).toEqual({ x: 50, y: 60 });
			expect(store.getState().hasCommandsToUndo).toBe(true);
			expect(store.getState().hasCommandsToRedo).toBe(false);
		});
	});

	describe("historique de la pile fournie", () => {
		it("reflète hasCommandsToUndo/Redo dès la création (page rouverte)", () => {
			const commandsStack = new CommandsStack<HmiPage>(100);
			commandsStack.commandsToUndo.push([]);

			const store = createHmiStore(HmiPage.create("Vue 1"), commandsStack);

			expect(store.getState().hasCommandsToUndo).toBe(true);
		});
	});
});
