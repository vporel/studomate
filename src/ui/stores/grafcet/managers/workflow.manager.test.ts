import { Dialect } from "@/expression-language/dialect.enum";
import CommandsStack from "@/schemas/commands/commands-stack.schema";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import JunctionAndStartBuilder from "@/schemas/grafcet/builders/junction-and-start.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import Connection from "@/schemas/grafcet/connection.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { GrafcetEdgeType, GrafcetNodeType } from "@/ui/components/grafcet/flow/grafcet-nodes-definitions";
import { createGrafcetStore } from "../grafcet.store";

function node(id: string, overrides: Partial<GrafcetNodeType["data"]> = {}): GrafcetNodeType {
	return {
		id,
		type: "step",
		position: { x: 0, y: 0 },
		data: { number: "", initial: false, ...overrides },
	} as any;
}

function edge(id: string, source: string, target: string): GrafcetEdgeType {
	return { id, source, target, sourceHandle: "source:successor", targetHandle: "target:predecessor", data: { points: [] } } as any;
}

function buildStore() {
	const grafcet = new GrafcetBuilder()
		.addStep(new StepBuilder().id("step-1").number(1).initial().position(0, 0).build())
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

	it("n'exécute aucune commande pendant un redimensionnement (resizing: true)", () => {
		const store = buildStore();
		const executeSpy = jest.spyOn(store.getState().commandsStackManager, "executeOperation");

		store.getState().workflowManager.handleNodesChange([
			{ id: "step-1", type: "dimensions", dimensions: { width: 60, height: 60 }, resizing: true },
		]);

		expect(executeSpy).not.toHaveBeenCalled();
	});

	// Une jonction garde ses branches à une position relative constante par rapport au nœud :
	// un déplacement accompagné d'un redimensionnement (glisser un bord pendant un resize) doit
	// donc translater le pivot et les branches du même delta que la position.
	it("translate le pivot et les branches d'une jonction quand position ET dimensions changent dans le même lot", () => {
		const store = buildStore();
		const junctionBefore = store.getState().grafcet.getElementById<any>("junction-1")!;
		const pivotBefore = junctionBefore.data.pivotPosition;
		const branchPositionsBefore = Object.values(junctionBefore.data.branches).map((b: any) => b.position);

		store.getState().workflowManager.handleNodesChange([
			{ id: "junction-1", type: "position", position: { x: 80, y: 100 }, dragging: true },
			{
				id: "junction-1",
				type: "dimensions",
				dimensions: { width: 220, height: 30 },
				resizing: true,
				setAttributes: true,
			},
		]);

		const junctionAfter = store.getState().nodes.find((n) => n.id === "junction-1")! as any;
		const delta = 100 - 80; //node.position.x (avant) - change.position.x
		expect(junctionAfter.data.pivotPosition).toBe(pivotBefore + delta);
		expect(junctionAfter.width).toBe(220);
		const branchPositionsAfter = Object.values(junctionAfter.data.branches).map((b: any) => b.position);
		expect(branchPositionsAfter).toEqual(branchPositionsBefore.map((p: any) => p + delta));
	});

	it("met à jour uniquement la largeur d'une jonction sur un changement de dimensions sans position", () => {
		const store = buildStore();
		const junctionBefore = store.getState().grafcet.getElementById<any>("junction-1")!;
		const pivotBefore = junctionBefore.data.pivotPosition;

		store.getState().workflowManager.handleNodesChange([
			{
				id: "junction-1",
				type: "dimensions",
				dimensions: { width: 250, height: 30 },
				resizing: true,
				setAttributes: true,
			},
		]);

		const junctionAfter = store.getState().nodes.find((n) => n.id === "junction-1")! as any;
		expect(junctionAfter.width).toBe(250);
		expect(junctionAfter.data.pivotPosition).toBe(pivotBefore);
	});
});

describe("WorkflowManager.addNodesAndEdges", () => {
	// `ConnectionsCommandsFactory.onEdgesAdd` ne résout les extrémités d'une arête que parmi les
	// nœuds tout juste ajoutés (pas les nœuds déjà présents) : la commande d'arête référence donc
	// des éléments qui n'existent pas encore dans le grafcet tant que la commande de nœuds ne
	// s'est pas exécutée avant elle.
	it("exécute les commandes de nœuds avant celles d'arêtes (une arête peut référencer deux nœuds tout juste ajoutés)", () => {
		const store = buildStore();
		const newStepA = node("step-2", { number: 2 });
		const newStepB = node("step-3", { number: 3 });
		const newEdge = edge("e1", "step-2", "step-3");

		expect(() =>
			store.getState().workflowManager.addNodesAndEdges([newStepA, newStepB], [newEdge]),
		).not.toThrow();

		expect(store.getState().grafcet.getElementById("step-2")).toBeDefined();
		expect(store.getState().grafcet.getElementById("step-3")).toBeDefined();
		expect(store.getState().grafcet.getConnection("step-2", "step-3")).toBeDefined();
	});
});

describe("WorkflowManager.deleteNodesAndEdges", () => {
	function buildStoreWithConnectedSteps() {
		const grafcet = new GrafcetBuilder()
			.addStep(new StepBuilder().id("step-1").number(1).initial().position(0, 0).build())
			.addStep(new StepBuilder().id("step-2").number(2).position(0, 100).build())
			.build();
		grafcet.addConnections([
			new Connection(
				"e1",
				{ type: "step", id: "step-1", handle: "source:successor" },
				{ type: "step", id: "step-2", handle: "target:predecessor" },
			),
		]);
		return createGrafcetStore(grafcet, new CommandsStack<Grafcet>(100), () => Dialect.FR);
	}

	it("ne re-supprime pas une arête déjà supprimée en cascade par la suppression de son nœud", () => {
		const store = buildStoreWithConnectedSteps();

		expect(() =>
			store.getState().workflowManager.deleteNodesAndEdges(["step-1"], ["e1"]),
		).not.toThrow();

		expect(store.getState().grafcet.getElementById("step-1")).toBeUndefined();
		expect(store.getState().grafcet.connections).toEqual([]);
	});
});

describe("WorkflowManager.updateNodeData", () => {
	it("ne dispatche rien quand nodeDataToUpdate est nul (nœud inconnu)", () => {
		const store = buildStore();
		const executeSpy = jest.spyOn(store.getState().commandsStackManager, "executeOperation");

		store.getState().workflowManager.updateNodeData("inexistant", { number: "5" } as any);

		expect(executeSpy).not.toHaveBeenCalled();
	});
});

describe("WorkflowManager.deleteJunctionBranch", () => {
	it("lève sur un id de nœud inconnu", () => {
		const store = buildStore();

		expect(() => store.getState().workflowManager.deleteJunctionBranch("inexistant", "branch-1")).toThrow();
	});

	it("lève sur un nœud qui n'est pas une jonction", () => {
		const store = buildStore();

		expect(() => store.getState().workflowManager.deleteJunctionBranch("step-1", "branch-1")).toThrow();
	});

	it("ne fait rien quand la jonction n'a que 2 branches", () => {
		const store = buildStore();
		const junction = store.getState().grafcet.getElementById<any>("junction-1")!;
		const [branchId] = junction.data.branchesOrder;
		const executeSpy = jest.spyOn(store.getState().commandsStackManager, "executeOperation");

		store.getState().workflowManager.deleteJunctionBranch("junction-1", branchId);

		expect(executeSpy).not.toHaveBeenCalled();
		expect(store.getState().grafcet.getElementById<any>("junction-1")!.data.branchesOrder).toHaveLength(2);
	});

	it("supprime la branche et ses connexions rattachées quand la jonction a 3 branches ou plus", () => {
		const grafcet = new GrafcetBuilder()
			.addJunctionAndStart(new JunctionAndStartBuilder().id("junction-1").nBranches(3).position(0, 0).build())
			.build();
		const store = createGrafcetStore(grafcet, new CommandsStack<Grafcet>(100), () => Dialect.FR);
		const junction = store.getState().grafcet.getElementById<any>("junction-1")!;
		const [branchToRemove] = junction.data.branchesOrder;

		store.getState().workflowManager.deleteJunctionBranch("junction-1", branchToRemove);

		const updated = store.getState().grafcet.getElementById<any>("junction-1")!;
		expect(updated.data.branchesOrder).toHaveLength(2);
		expect(updated.data.branchesOrder).not.toContain(branchToRemove);
	});
});

describe("WorkflowManager.adoptGrafcet", () => {
	it("préserve l'identité des nœuds non touchés par le nouveau grafcet", () => {
		const store = buildStore();
		const stepNodeBefore = store.getState().nodes.find((n) => n.id === "step-1")!;

		const adopted = store.getState().grafcet.copy();
		adopted.getElementById<any>("junction-1")!.position = { x: 500, y: 500 };
		store.getState().workflowManager.adoptGrafcet(adopted);

		const stepNodeAfter = store.getState().nodes.find((n) => n.id === "step-1")!;
		expect(stepNodeAfter).toBe(stepNodeBefore);
		expect(store.getState().grafcet).toBe(adopted);
	});
});

function createStoreAndCollectPrevNode() {
	const grafcetStore = buildStore();
	const { workflowManager, nodes } = grafcetStore.getState();
	return { workflowManager, nodes, getStoreState: grafcetStore.getState };
}
