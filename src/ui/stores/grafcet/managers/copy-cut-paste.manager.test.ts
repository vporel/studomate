/**
 * @jest-environment jsdom
 */
import { Dialect } from "@/expression-language/dialect.enum";
import CommandsStack from "@/schemas/commands/commands-stack.schema";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { StepData } from "@/schemas/grafcet/step.schema";
import { GrafcetNodeType } from "@/ui/components/grafcet/flow/grafcet-nodes-definitions";
import { createGrafcetStore } from "../grafcet.store";

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
		.addStep(
			new StepBuilder().id("step-1").number(1).initial().position(0, 0).build(),
		)
		.build();
	const store = createGrafcetStore(
		grafcet,
		new CommandsStack<Grafcet>(100),
		() => Dialect.FR,
	);
	store.getState().viewManager.rfInstance = fakeRfInstance();
	return store;
}

function selectStep(store: ReturnType<typeof buildStore>) {
	store.setState((state) => ({
		nodes: state.nodes.map((n) => ({
			...n,
			selected: n.id === "step-1",
		})) as GrafcetNodeType[],
	}));
}

describe("GrafcetCopyCutPasteManager", () => {
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

			const { addedNodes } = store
				.getState()
				.copyCutPasteManager.pasteElements();

			expect(addedNodes).toHaveLength(1);
			expect(addedNodes[0].id).not.toBe("step-1");
		});

		it("ajoute réellement le nœud collé au store", () => {
			const store = buildStore();
			selectStep(store);
			store.getState().copyCutPasteManager.copySelectedElements();

			const { addedNodes } = store
				.getState()
				.copyCutPasteManager.pasteElements();

			expect(
				store.getState().nodes.some((n) => n.id === addedNodes[0].id),
			).toBe(true);
		});

		// Invariant du domaine : une seule étape initiale par grafcet. Sans cette règle, coller
		// une étape initiale en créerait une seconde, un état que l'analyseur rejette.
		it("ne colle pas une seconde étape initiale si une existe déjà", () => {
			const store = buildStore();
			selectStep(store); // step-1 est initiale
			store.getState().copyCutPasteManager.copySelectedElements();

			const { addedNodes } = store
				.getState()
				.copyCutPasteManager.pasteElements();

			expect((addedNodes[0].data as StepData).initial).toBe(false);
		});

		it("attribue à l'étape collée un numéro différent de l'original", () => {
			const store = buildStore();
			selectStep(store);
			store.getState().copyCutPasteManager.copySelectedElements();

			const { addedNodes } = store
				.getState()
				.copyCutPasteManager.pasteElements();

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
			const { addedNodes } = store
				.getState()
				.copyCutPasteManager.pasteElements();

			expect(addedNodes).toHaveLength(0);
		});
	});

	describe("collage réel avec connexions", () => {
		function buildStoreWithConnectedSteps() {
			const connection = new ConnectionBuilder()
				.id("e1")
				.source("step", "step-1", "source:successor")
				.target("step", "step-2", "target:predecessor")
				.data([
					[0, 0],
					[0, 100],
				])
				.build();
			const grafcet = new GrafcetBuilder()
				.id("g1")
				.addStep(
					new StepBuilder()
						.id("step-1")
						.number(1)
						.initial()
						.position(0, 0)
						.build(),
				)
				.addStep(
					new StepBuilder().id("step-2").number(2).position(0, 100).build(),
				)
				.addConnection(connection)
				.build();
			const store = createGrafcetStore(
				grafcet,
				new CommandsStack<Grafcet>(100),
				() => Dialect.FR,
			);
			store.getState().viewManager.rfInstance = fakeRfInstance();
			return store;
		}

		it("recrée avec de nouveaux ids une connexion interne à la sélection copiée", () => {
			const store = buildStoreWithConnectedSteps();
			const { nodes, edges } = store.getState();
			store.getState().copyCutPasteManager.copyElements(nodes, edges);

			const { addedNodes, addedEdges } = store
				.getState()
				.copyCutPasteManager.pasteElements();

			expect(addedEdges).toHaveLength(1);
			expect(addedEdges[0].id).not.toBe("e1");
			const newIds = addedNodes.map((n) => n.id);
			expect(newIds).toContain(addedEdges[0].source);
			expect(newIds).toContain(addedEdges[0].target);
		});

		it("ne recrée pas une connexion dont l'autre extrémité n'a pas été copiée", () => {
			const store = buildStoreWithConnectedSteps();
			const { nodes, edges } = store.getState();
			const step1Only = nodes.filter((n) => n.id === "step-1");
			// Presse-papiers volontairement incohérent : l'arête référence step-2, non copié.
			store.getState().copyCutPasteManager.copyElements(step1Only, edges);

			const { addedEdges } = store
				.getState()
				.copyCutPasteManager.pasteElements();

			expect(addedEdges).toHaveLength(0);
		});

		it("décale les éléments collés depuis la position de la souris", () => {
			const store = buildStoreWithConnectedSteps();
			const { nodes, edges } = store.getState();
			store.getState().copyCutPasteManager.copyElements(nodes, edges);

			const { addedNodes } = store
				.getState()
				.copyCutPasteManager.pasteElements({ x: 500, y: 500 });

			const originalStep1 = nodes.find((n) => n.id === "step-1")!;
			const pastedStep1 =
				addedNodes.find((n) => (n.data as StepData).number !== 1) ??
				addedNodes[0];
			expect(pastedStep1.position).not.toEqual(originalStep1.position);
		});
	});

	describe("cutSelectedElements", () => {
		it("copie puis retire les éléments sélectionnés du grafcet", () => {
			const store = buildStore();
			selectStep(store);

			store.getState().copyCutPasteManager.cutSelectedElements();

			expect(store.getState().nodes.some((n) => n.id === "step-1")).toBe(false);
			const { addedNodes } = store
				.getState()
				.copyCutPasteManager.pasteElements();
			expect(addedNodes).toHaveLength(1);
		});

		it("ne fait rien quand rien n'est sélectionné", () => {
			const store = buildStore();

			store.getState().copyCutPasteManager.cutSelectedElements();

			expect(store.getState().nodes).toHaveLength(1);
			const { addedNodes } = store
				.getState()
				.copyCutPasteManager.pasteElements();
			expect(addedNodes).toHaveLength(0);
		});
	});
});
