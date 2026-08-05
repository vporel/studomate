import { Dialect } from "@/expression-language/dialect.enum";
import CommandsStack from "@/schemas/commands/commands-stack.schema";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { StepData } from "@/schemas/grafcet/step.schema";
import { GrafcetNodeType } from "@/ui/components/grafcet/flow/grafcet-nodes-definitions";
import { createGrafcetStore } from "../grafcet.store";

//`focusFlow` touche le DOM (`document.getElementById`), indisponible en environnement de
//test "node". Le focus visuel n'est pas ce que ce test vérifie.
jest.mock("../flow-management", () => ({ focusFlow: jest.fn() }));

/**
 * Instance React Flow minimale : `pasteElements` n'a besoin que de ces deux méthodes.
 * Sans elle, le collage renvoie `{ addedNodes: [], addedEdges: [] }` sans rien faire.
 */
function fakeRfInstance() {
	return {
		screenToFlowPosition: (p: { x: number; y: number }) => p,
		getNodesBounds: (nodes: { position: { x: number; y: number } }[]) => {
			const xs = nodes.map((n) => n.position.x);
			const ys = nodes.map((n) => n.position.y);
			return { x: Math.min(...xs), y: Math.min(...ys), width: 40, height: 40 };
		},
	} as any;
}

function buildStore() {
	const grafcet = new GrafcetBuilder()
		.id("g1")
		.addStep(new StepBuilder().id("step-1").number(1).initial().position(0, 0).build())
		.build();
	const store = createGrafcetStore(grafcet, new CommandsStack<Grafcet>(100), () => Dialect.FR);
	store.getState().viewManager.rfInstance = fakeRfInstance();
	return store;
}

function selectStep(store: ReturnType<typeof buildStore>) {
	store.setState((state) => ({
		nodes: state.nodes.map((n) => ({ ...n, selected: n.id === "step-1" })) as GrafcetNodeType[],
	}));
}

describe("CopyCutPasteManager", () => {
	describe("copySelectedElements / pasteElements", () => {
		it("ne colle rien si le presse-papiers est vide", () => {
			const store = buildStore();

			const result = store.getState().copyCutPasteManager.pasteElements();

			expect(result.addedNodes).toHaveLength(0);
		});

		it("colle une copie du nœud sélectionné avec un nouvel identifiant", () => {
			const store = buildStore();
			selectStep(store);
			store.getState().copyCutPasteManager.copySelectedElements();

			const { addedNodes } = store.getState().copyCutPasteManager.pasteElements();

			expect(addedNodes).toHaveLength(1);
			expect(addedNodes[0].id).not.toBe("step-1");
		});

		it("ajoute réellement le nœud collé au store", () => {
			const store = buildStore();
			selectStep(store);
			store.getState().copyCutPasteManager.copySelectedElements();

			const { addedNodes } = store.getState().copyCutPasteManager.pasteElements();

			expect(store.getState().nodes.some((n) => n.id === addedNodes[0].id)).toBe(true);
		});

		// Invariant du domaine : une seule étape initiale par grafcet. Sans cette règle, coller
		// une étape initiale en créerait une seconde, un état que l'analyseur rejette.
		it("ne colle pas une seconde étape initiale si une existe déjà", () => {
			const store = buildStore();
			selectStep(store); // step-1 est initiale
			store.getState().copyCutPasteManager.copySelectedElements();

			const { addedNodes } = store.getState().copyCutPasteManager.pasteElements();

			expect((addedNodes[0].data as StepData).initial).toBe(false);
		});

		it("attribue à l'étape collée un numéro différent de l'original", () => {
			const store = buildStore();
			selectStep(store);
			store.getState().copyCutPasteManager.copySelectedElements();

			const { addedNodes } = store.getState().copyCutPasteManager.pasteElements();

			expect((addedNodes[0].data as StepData).number).not.toBe(1);
		});

		it("ne modifie pas l'élément original", () => {
			const store = buildStore();
			selectStep(store);
			store.getState().copyCutPasteManager.copySelectedElements();

			store.getState().copyCutPasteManager.pasteElements();

			const original = store.getState().nodes.find((n) => n.id === "step-1")!;
			expect((original.data as StepData).number).toBe(1);
			expect((original.data as StepData).initial).toBe(true);
		});

		it("ne colle rien si rien n'est sélectionné", () => {
			const store = buildStore();

			store.getState().copyCutPasteManager.copySelectedElements();
			const { addedNodes } = store.getState().copyCutPasteManager.pasteElements();

			expect(addedNodes).toHaveLength(0);
		});
	});
});
