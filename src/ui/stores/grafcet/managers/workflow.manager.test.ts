import { Dialect } from "@/expression-language/dialect.enum";
import CommandsStack from "@/schemas/commands/commands-stack.schema";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import JunctionAndStartBuilder from "@/schemas/grafcet/builders/junction-and-start.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { createGrafcetStore } from "../grafcet.store";

function buildStore() {
	const grafcet = new GrafcetBuilder()
		.addStep(new StepBuilder().id("step-1").number(1).position(0, 0).build())
		.addJunctionAndStart(new JunctionAndStartBuilder().id("junction-1").position(100, 100).build())
		.build();
	return createGrafcetStore(grafcet, new CommandsStack<Grafcet>(100), () => Dialect.FR);
}

describe("WorkflowManager.handleNodesChange — identité des nœuds", () => {
	// Régression §3.2 : un structuredClone de tous les nœuds était fait à chaque appel,
	// c'est-à-dire à chaque frame d'un glisser-déposer. Seul le nœud jonction réellement
	// modifié doit changer de référence ; les autres doivent garder la leur.
	it("préserve la référence des nœuds non concernés par le changement", () => {
		const store = createStoreAndCollectPrevNode();
		const { workflowManager, nodes: prevNodes } = store;
		const stepNodeBefore = prevNodes.find((n) => n.id === "step-1")!;

		workflowManager.handleNodesChange([
			{ id: "junction-1", type: "position", position: { x: 5, y: 5 }, dragging: true },
		]);

		const stepNodeAfter = store.getStoreState().nodes.find((n) => n.id === "step-1")!;
		expect(stepNodeAfter).toBe(stepNodeBefore);
	});

	it("donne une nouvelle référence au nœud jonction concerné", () => {
		const store = createStoreAndCollectPrevNode();
		const junctionBefore = store.nodes.find((n) => n.id === "junction-1")!;

		store.workflowManager.handleNodesChange([
			{ id: "junction-1", type: "position", position: { x: 5, y: 5 }, dragging: true },
		]);

		const junctionAfter = store.getStoreState().nodes.find((n) => n.id === "junction-1")!;
		expect(junctionAfter).not.toBe(junctionBefore);
	});

	it("ignore un identifiant qui ne correspond à aucun nœud", () => {
		const store = createStoreAndCollectPrevNode();

		expect(() =>
			store.workflowManager.handleNodesChange([
				{ id: "inexistant", type: "position", position: { x: 5, y: 5 }, dragging: true },
			]),
		).not.toThrow();
	});
});

function createStoreAndCollectPrevNode() {
	const grafcetStore = buildStore();
	const { workflowManager, nodes } = grafcetStore.getState();
	return { workflowManager, nodes, getStoreState: grafcetStore.getState };
}
