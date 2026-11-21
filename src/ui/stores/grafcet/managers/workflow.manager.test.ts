import { Dialect } from "@/expression-language/dialect.enum";
import CommandsStack from "@/schemas/commands/commands-stack.schema";
import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import JunctionAndStartBuilder from "@/schemas/grafcet/builders/junction-and-start.builder";
import Step from "@/schemas/grafcet/step.schema";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import StepReferralSourceBuilder from "@/schemas/grafcet/builders/step-referral-source.builder";
import StepReferralTargetBuilder from "@/schemas/grafcet/builders/step-referral-target.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import Connection from "@/schemas/grafcet/connection.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import {
	GrafcetEdgeType,
	GrafcetNodeType,
} from "@/ui/components/grafcet/flow/grafcet-nodes-definitions";
import { createGrafcetStore } from "../grafcet.store";
import { actionLink } from "@tests/utils/grafcet-factory";

// On fixe une largeur de page connue pour les assertions d'insertion de branche.
jest.mock("@/ui/utils/grafcet/grafcet-utils", () => ({
	...jest.requireActual("@/ui/utils/grafcet/grafcet-utils"),
	GRAFCET_PAGE_DIMENSIONS: { width: 1000, height: 1400 },
	GRAFCET_PAGE_EXTENT: [
		[0, 0],
		[998, 1398],
	],
}));

function node(
	id: string,
	overrides: Partial<GrafcetNodeType["data"]> = {},
): GrafcetNodeType {
	return {
		id,
		type: "step",
		position: { x: 0, y: 0 },
		data: { number: "", initial: false, ...overrides },
	} as any;
}

function edge(id: string, source: string, target: string): GrafcetEdgeType {
	return {
		id,
		source,
		target,
		sourceHandle: "source:successor",
		targetHandle: "target:predecessor",
		data: { points: [] },
	} as any;
}

function buildStore() {
	const grafcet = new GrafcetBuilder()
		.addStep(
			new StepBuilder().id("step-1").number(1).initial().position(0, 0).build(),
		)
		.addJunctionAndStart(
			new JunctionAndStartBuilder().id("junction-1").position(100, 100).build(),
		)
		.build();
	return createGrafcetStore(
		grafcet,
		new CommandsStack<Grafcet>(100),
		() => Dialect.FR,
	);
}

describe("GrafcetWorkflowManager.handleNodesChange — identité des nœuds", () => {
	// Régression §3.2 : un structuredClone de tous les nœuds était fait à chaque appel,
	// c'est-à-dire à chaque frame d'un glisser-déposer. Seul le nœud jonction réellement
	// modifié doit changer de référence ; les autres doivent garder la leur.
	it("préserve la référence des nœuds non concernés par le changement", () => {
		const store = createStoreAndCollectPrevNode();
		const { workflowManager, nodes: prevNodes } = store;
		const stepNodeBefore = prevNodes.find((n) => n.id === "step-1")!;

		workflowManager.handleNodesChange([
			{
				id: "junction-1",
				type: "position",
				position: { x: 5, y: 5 },
				dragging: true,
			},
		]);

		const stepNodeAfter = store
			.getStoreState()
			.nodes.find((n) => n.id === "step-1")!;
		expect(stepNodeAfter).toBe(stepNodeBefore);
	});

	it("donne une nouvelle référence au nœud jonction concerné", () => {
		const store = createStoreAndCollectPrevNode();
		const junctionBefore = store.nodes.find((n) => n.id === "junction-1")!;

		store.workflowManager.handleNodesChange([
			{
				id: "junction-1",
				type: "position",
				position: { x: 5, y: 5 },
				dragging: true,
			},
		]);

		const junctionAfter = store
			.getStoreState()
			.nodes.find((n) => n.id === "junction-1")!;
		expect(junctionAfter).not.toBe(junctionBefore);
	});

	it("ignore un identifiant qui ne correspond à aucun nœud", () => {
		const store = createStoreAndCollectPrevNode();

		expect(() =>
			store.workflowManager.handleNodesChange([
				{
					id: "inexistant",
					type: "position",
					position: { x: 5, y: 5 },
					dragging: true,
				},
			]),
		).not.toThrow();
	});

	it("n'exécute aucune commande pendant un redimensionnement (resizing: true)", () => {
		const store = buildStore();
		const executeSpy = jest.spyOn(
			store.getState().commandsStackManager,
			"executeOperation",
		);

		store.getState().workflowManager.handleNodesChange([
			{
				id: "step-1",
				type: "dimensions",
				dimensions: { width: 60, height: 60 },
				resizing: true,
			},
		]);

		expect(executeSpy).not.toHaveBeenCalled();
	});

	it("ignore un changement de dimensions ciblant une jonction (largeur portée par le domaine)", () => {
		const store = buildStore();
		const executeSpy = jest.spyOn(
			store.getState().commandsStackManager,
			"executeOperation",
		);
		const widthBefore = store
			.getState()
			.grafcet.getElementById<any>("junction-1")!.size.width;

		store.getState().workflowManager.handleNodesChange([
			{
				id: "junction-1",
				type: "dimensions",
				dimensions: { width: 320, height: 30 },
				resizing: false,
				setAttributes: true,
			},
		]);

		// aucune commande de redimensionnement produite
		for (const [commands] of executeSpy.mock.calls)
			expect(commands).toHaveLength(0);
		expect(
			store.getState().grafcet.getElementById<any>("junction-1")!.size.width,
		).toBe(widthBefore);
		expect(
			(store.getState().nodes.find((n) => n.id === "junction-1") as any).width,
		).toBe(widthBefore);
	});
});

describe("GrafcetWorkflowManager.addJunctionBranch", () => {
	it("insère une branche à droite en une seule commande (données + taille), annulable d'un coup", () => {
		const store = buildStore();
		const before = store.getState().grafcet.getElementById<any>("junction-1")!;
		const branchCountBefore = before.data.branchesOrder.length;
		const widthBefore = before.size.width;

		store
			.getState()
			.workflowManager.addJunctionBranch("junction-1", branchCountBefore);

		const afterNode = store
			.getState()
			.nodes.find((n) => n.id === "junction-1")! as any;
		expect(afterNode.data.branchesOrder).toHaveLength(branchCountBefore + 1);
		expect(afterNode.width).toBeGreaterThan(widthBefore);

		store.getState().commandsStackManager.undoOperation();

		const restored = store
			.getState()
			.grafcet.getElementById<any>("junction-1")!;
		expect(restored.data.branchesOrder).toHaveLength(branchCountBefore);
		expect(restored.size.width).toBe(widthBefore);
	});

	it("décale la jonction vers la gauche pour une insertion en tête", () => {
		const store = buildStore();
		const xBefore = store.getState().grafcet.getElementById<any>("junction-1")!
			.position.x;

		store.getState().workflowManager.addJunctionBranch("junction-1", 0);

		const after = store.getState().grafcet.getElementById<any>("junction-1")!;
		expect(after.position.x).toBeLessThan(xBefore);
		expect(after.data.branchesOrder).toHaveLength(3);
	});
});

describe("GrafcetWorkflowManager.addJunctionBranch (garde-fous)", () => {
	it("lève sur un id de nœud inconnu", () => {
		const store = buildStore();

		expect(() =>
			store.getState().workflowManager.addJunctionBranch("inexistant", 0),
		).toThrow();
	});

	it("lève sur un nœud qui n'est pas une jonction", () => {
		const store = buildStore();

		expect(() =>
			store.getState().workflowManager.addJunctionBranch("step-1", 0),
		).toThrow();
	});
});

describe("GrafcetWorkflowManager.applyJunctionBranchDrag", () => {
	it("lève sur un id de nœud inconnu ou un nœud qui n'est pas une jonction", () => {
		const store = buildStore();
		const result = { branches: {}, pivotPosition: 0, nodeX: 0, width: 0 };

		expect(() =>
			store
				.getState()
				.workflowManager.applyJunctionBranchDrag("inexistant", result),
		).toThrow();
		expect(() =>
			store
				.getState()
				.workflowManager.applyJunctionBranchDrag("step-1", result),
		).toThrow();
	});

	it("applique données, position et taille en une commande, annulable d'un coup", () => {
		const store = buildStore();
		const before = store.getState().grafcet.getElementById<any>("junction-1")!;
		const { branchesOrder, branches } = before.data;
		const moved = {
			...branches,
			[branchesOrder[0]]: { ...branches[branchesOrder[0]], position: 25 },
		};
		const snapshot = {
			data: structuredClone(before.data),
			position: { ...before.position },
			size: { ...before.size },
		};

		store.getState().workflowManager.applyJunctionBranchDrag("junction-1", {
			branches: moved,
			pivotPosition: 42,
			nodeX: before.position.x + 15,
			width: before.size.width - 15,
		});

		const after = store.getState().grafcet.getElementById<any>("junction-1")!;
		expect(after.data.branches[branchesOrder[0]].position).toBe(25);
		expect(after.data.branchesOrder).toEqual(branchesOrder);
		expect(after.data.pivotPosition).toBe(42);
		expect(after.position).toEqual({
			x: before.position.x + 15,
			y: before.position.y,
		});
		expect(after.size).toEqual({
			width: before.size.width - 15,
			height: before.size.height,
		});

		store.getState().commandsStackManager.undoOperation();

		const restored = store
			.getState()
			.grafcet.getElementById<any>("junction-1")!;
		expect(restored.data).toEqual(snapshot.data);
		expect(restored.position).toEqual(snapshot.position);
		expect(restored.size).toEqual(snapshot.size);
	});
});

describe("GrafcetWorkflowManager.previewJunctionBarPosition", () => {
	it("patche la vue sans toucher le grafcet ni pousser de commande", () => {
		const store = buildStore();
		const executeSpy = jest.spyOn(
			store.getState().commandsStackManager,
			"executeOperation",
		);
		const pivotBefore = store
			.getState()
			.grafcet.getElementById<any>("junction-1")!.data.pivotPosition;

		store.getState().workflowManager.previewJunctionBarPosition("junction-1", {
			pivotPosition: pivotBefore + 30,
		});

		const junctionNode = store
			.getState()
			.nodes.find((n) => n.id === "junction-1")! as any;
		expect(junctionNode.data.pivotPosition).toBe(pivotBefore + 30);
		expect(
			store.getState().grafcet.getElementById<any>("junction-1")!.data
				.pivotPosition,
		).toBe(pivotBefore);
		expect(executeSpy).not.toHaveBeenCalled();
	});
});

describe("GrafcetWorkflowManager.addNodesAndEdges", () => {
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
			store
				.getState()
				.workflowManager.addNodesAndEdges([newStepA, newStepB], [newEdge]),
		).not.toThrow();

		expect(store.getState().grafcet.getElementById("step-2")).toBeDefined();
		expect(store.getState().grafcet.getElementById("step-3")).toBeDefined();
		expect(
			store.getState().grafcet.getConnection("step-2", "step-3"),
		).toBeDefined();
	});
});

describe("GrafcetWorkflowManager.addActionToStep", () => {
	it("sans action existante : place l'action à x+80 de l'étape et crée la connexion étape → action", () => {
		const store = buildStore(); // step-1 en (0, 0)

		store.getState().workflowManager.addActionToStep("step-1");

		const grafcet = store.getState().grafcet;
		const actions = grafcet.getElementsByType("action");
		expect(actions).toHaveLength(1);
		expect(actions[0].position).toEqual({ x: 80, y: 0 });

		const connection = grafcet.getConnection("step-1", actions[0].id);
		expect(connection).toBeDefined();
		expect(connection!.source.handle).toBe("source:action");
		expect(connection!.target.handle).toBe("target:predecessor");
	});

	it("avec des actions existantes : colle la nouvelle à droite de la plus à droite (sans gap)", () => {
		const store = buildStore();
		const workflowManager = store.getState().workflowManager;

		workflowManager.addActionToStep("step-1");
		workflowManager.addActionToStep("step-1");

		const xs = store
			.getState()
			.grafcet.getElementsByType("action")
			.map((a) => a.position.x)
			.sort((a, b) => a - b);
		// 80, puis 80 + largeur par défaut (100)
		expect(xs).toEqual([80, 180]);
	});

	it("avec des actions existantes : chaîne la nouvelle après la dernière action de la chaîne", () => {
		const store = buildStore();
		const workflowManager = store.getState().workflowManager;

		workflowManager.addActionToStep("step-1");
		workflowManager.addActionToStep("step-1");
		workflowManager.addActionToStep("step-1");

		const grafcet = store.getState().grafcet;
		const [first, second, third] = [
			...grafcet.getElementsByType("action"),
		].sort((a, b) => a.position.x - b.position.x);
		expect(grafcet.getConnection("step-1", first.id)).toBeDefined();
		const firstToSecond = grafcet.getConnection(first.id, second.id);
		expect(firstToSecond?.source.handle).toBe("source:next");
		expect(firstToSecond?.target.handle).toBe("target:predecessor");
		expect(grafcet.getConnection(second.id, third.id)).toBeDefined();
		expect(grafcet.getConnection("step-1", second.id)).toBeUndefined();
		expect(grafcet.getConnection("step-1", third.id)).toBeUndefined();
	});

	it("est annulable (nœud et connexion retirés)", () => {
		const store = buildStore();
		store.getState().workflowManager.addActionToStep("step-1");

		store.getState().commandsStackManager.undoOperation();

		expect(store.getState().grafcet.getElementsByType("action")).toHaveLength(
			0,
		);
		expect(store.getState().grafcet.connections).toHaveLength(0);
	});
});

describe("GrafcetWorkflowManager.addTransitionAfterStep", () => {
	it("ajoute une transition à y+50 (même x) et la connecte à l'étape", () => {
		const store = buildStore(); // step-1 en (0, 0), sans aval

		store.getState().workflowManager.addTransitionAfterStep("step-1");

		const grafcet = store.getState().grafcet;
		const transitions = grafcet.getElementsByType("transition");
		expect(transitions).toHaveLength(1);
		expect(transitions[0].position).toEqual({ x: 0, y: 50 });

		const connection = grafcet.getConnection("step-1", transitions[0].id);
		expect(connection).toBeDefined();
		expect(connection!.source.handle).toBe("source:successor");
		expect(connection!.target.handle).toBe("target:predecessor");
	});

	it("ne fait rien si l'étape a déjà un élément aval", () => {
		const grafcet = new GrafcetBuilder()
			.addStep(
				new StepBuilder()
					.id("step-1")
					.number(1)
					.initial()
					.position(0, 0)
					.build(),
			)
			.addTransition(
				new TransitionBuilder()
					.id("tr-1")
					.expression("")
					.position(0, 50)
					.build(),
			)
			.build();
		grafcet.addConnections([
			new Connection(
				"e1",
				{ type: "step", id: "step-1", handle: "source:successor" },
				{ type: "transition", id: "tr-1", handle: "target:predecessor" },
			),
		]);
		const store = createGrafcetStore(
			grafcet,
			new CommandsStack<Grafcet>(100),
			() => Dialect.FR,
		);

		store.getState().workflowManager.addTransitionAfterStep("step-1");

		expect(
			store.getState().grafcet.getElementsByType("transition"),
		).toHaveLength(1);
	});
});

describe("GrafcetWorkflowManager.addStepAfterTransition", () => {
	function buildStoreWithTransition() {
		const grafcet = new GrafcetBuilder()
			.addStep(
				new StepBuilder()
					.id("step-1")
					.number(1)
					.initial()
					.position(0, 0)
					.build(),
			)
			.addTransition(
				new TransitionBuilder()
					.id("tr-1")
					.expression("")
					.position(0, 50)
					.build(),
			)
			.build();
		return createGrafcetStore(
			grafcet,
			new CommandsStack<Grafcet>(100),
			() => Dialect.FR,
		);
	}

	it("ajoute une étape à y+50 (même x), numéro suivant disponible, connectée à la transition", () => {
		const store = buildStoreWithTransition();

		store.getState().workflowManager.addStepAfterTransition("tr-1");

		const grafcet = store.getState().grafcet;
		const newStep = grafcet
			.getElementsByType("step")
			.find((s) => s.id !== "step-1")!;
		expect(newStep).toBeDefined();
		expect(newStep.position).toEqual({ x: 0, y: 100 });
		expect(newStep.data.number).toBe(2);

		const connection = grafcet.getConnection("tr-1", newStep.id);
		expect(connection).toBeDefined();
		expect(connection!.source.handle).toBe("source:successor");
		expect(connection!.target.handle).toBe("target:predecessor");
	});

	it("ne fait rien si la transition a déjà un élément aval", () => {
		const store = buildStoreWithTransition();
		store.getState().workflowManager.addStepAfterTransition("tr-1");
		expect(store.getState().grafcet.getElementsByType("step")).toHaveLength(2);

		store.getState().workflowManager.addStepAfterTransition("tr-1");
		expect(store.getState().grafcet.getElementsByType("step")).toHaveLength(2);
	});
});

describe("GrafcetWorkflowManager.deleteNodesAndEdges", () => {
	function buildStoreWithConnectedSteps() {
		const grafcet = new GrafcetBuilder()
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
			.build();
		grafcet.addConnections([
			new Connection(
				"e1",
				{ type: "step", id: "step-1", handle: "source:successor" },
				{ type: "step", id: "step-2", handle: "target:predecessor" },
			),
		]);
		return createGrafcetStore(
			grafcet,
			new CommandsStack<Grafcet>(100),
			() => Dialect.FR,
		);
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

describe("GrafcetWorkflowManager.updateNodeData", () => {
	it("ne dispatche rien quand nodeDataToUpdate est nul (nœud inconnu)", () => {
		const store = buildStore();
		const executeSpy = jest.spyOn(
			store.getState().commandsStackManager,
			"executeOperation",
		);

		store
			.getState()
			.workflowManager.updateNodeData("inexistant", { number: "5" } as any);

		expect(executeSpy).not.toHaveBeenCalled();
	});
});

describe("GrafcetWorkflowManager.deleteJunctionBranch", () => {
	it("lève sur un id de nœud inconnu", () => {
		const store = buildStore();

		expect(() =>
			store
				.getState()
				.workflowManager.deleteJunctionBranch("inexistant", "branch-1"),
		).toThrow();
	});

	it("lève sur un nœud qui n'est pas une jonction", () => {
		const store = buildStore();

		expect(() =>
			store
				.getState()
				.workflowManager.deleteJunctionBranch("step-1", "branch-1"),
		).toThrow();
	});

	it("ne fait rien quand la jonction n'a que 2 branches", () => {
		const store = buildStore();
		const junction = store
			.getState()
			.grafcet.getElementById<any>("junction-1")!;
		const [branchId] = junction.data.branchesOrder;
		const executeSpy = jest.spyOn(
			store.getState().commandsStackManager,
			"executeOperation",
		);

		store
			.getState()
			.workflowManager.deleteJunctionBranch("junction-1", branchId);

		expect(executeSpy).not.toHaveBeenCalled();
		expect(
			store.getState().grafcet.getElementById<any>("junction-1")!.data
				.branchesOrder,
		).toHaveLength(2);
	});

	it("supprime la branche et ses connexions rattachées quand la jonction a 3 branches ou plus", () => {
		const grafcet = new GrafcetBuilder()
			.addJunctionAndStart(
				new JunctionAndStartBuilder()
					.id("junction-1")
					.nBranches(3)
					.position(0, 0)
					.build(),
			)
			.build();
		const store = createGrafcetStore(
			grafcet,
			new CommandsStack<Grafcet>(100),
			() => Dialect.FR,
		);
		const junction = store
			.getState()
			.grafcet.getElementById<any>("junction-1")!;
		const [branchToRemove] = junction.data.branchesOrder;

		store
			.getState()
			.workflowManager.deleteJunctionBranch("junction-1", branchToRemove);

		const updated = store.getState().grafcet.getElementById<any>("junction-1")!;
		expect(updated.data.branchesOrder).toHaveLength(2);
		expect(updated.data.branchesOrder).not.toContain(branchToRemove);
	});
});

describe("GrafcetWorkflowManager.adoptGrafcet", () => {
	it("préserve l'identité des nœuds non touchés par le nouveau grafcet", () => {
		const store = buildStore();
		const stepNodeBefore = store
			.getState()
			.nodes.find((n) => n.id === "step-1")!;

		const adopted = store.getState().grafcet.copy();
		adopted.getElementById<any>("junction-1")!.position = { x: 500, y: 500 };
		store.getState().workflowManager.adoptGrafcet(adopted);

		const stepNodeAfter = store
			.getState()
			.nodes.find((n) => n.id === "step-1")!;
		expect(stepNodeAfter).toBe(stepNodeBefore);
		expect(store.getState().grafcet).toBe(adopted);
	});
});

function createStoreAndCollectPrevNode() {
	const grafcetStore = buildStore();
	const { workflowManager, nodes } = grafcetStore.getState();
	return { workflowManager, nodes, getStoreState: grafcetStore.getState };
}

describe("GrafcetWorkflowManager.addDroppedNode", () => {
	function droppedTransition(x: number, y: number): GrafcetNodeType {
		return {
			id: "dropped",
			type: "transition",
			position: { x, y },
			width: 40,
			height: 30,
			data: { expression: "" },
		} as any;
	}

	it("adds the element and links it to the adjacent step", () => {
		const store = buildStore(); // step-1 en (0, 0), 40x40

		store.getState().workflowManager.addDroppedNode(droppedTransition(0, 50));

		const grafcet = store.getState().grafcet;
		expect(grafcet.getElementById("dropped")).toBeDefined();
		const connection = grafcet.getConnection("step-1", "dropped");
		expect(connection!.source.handle).toBe("source:successor");
		expect(connection!.target.handle).toBe("target:predecessor");
	});

	it("corrects the position of an element dropped over its neighbour", () => {
		const store = buildStore(); // step-1 en (0, 0), 40x40

		store.getState().workflowManager.addDroppedNode(droppedTransition(0, 35));

		const grafcet = store.getState().grafcet;
		expect(grafcet.getElementById("dropped")!.position).toEqual({
			x: 0,
			y: 40,
		});
		expect(grafcet.getConnection("step-1", "dropped")).toBeDefined();
	});

	it("aligns the center of the element on its neighbour", () => {
		const store = buildStore(); // step-1 en (0, 0), 40x40

		store.getState().workflowManager.addDroppedNode(droppedTransition(7, 50));

		expect(
			store.getState().grafcet.getElementById("dropped")!.position,
		).toEqual({
			x: 0,
			y: 50,
		});
	});

	it("adds the element alone when nothing is adjacent", () => {
		const store = buildStore();

		store.getState().workflowManager.addDroppedNode(droppedTransition(0, 200));

		expect(store.getState().grafcet.getElementById("dropped")).toBeDefined();
		expect(store.getState().grafcet.connections).toHaveLength(0);
	});

	it("undoes the element and its link in a single operation", () => {
		const store = buildStore();
		store.getState().workflowManager.addDroppedNode(droppedTransition(0, 50));

		store.getState().commandsStackManager.undoOperation();

		expect(store.getState().grafcet.getElementById("dropped")).toBeUndefined();
		expect(store.getState().grafcet.connections).toHaveLength(0);
	});

	it("adds nothing when the node is refused (second initial step)", () => {
		const grafcet = new GrafcetBuilder()
			.addStep(
				new StepBuilder().id("init").number(1).initial().position(0, 0).build(),
			)
			.build();
		const store = createGrafcetStore(
			grafcet,
			new CommandsStack<Grafcet>(100),
			() => Dialect.FR,
		);
		const secondInitial = {
			id: "dropped",
			type: "step",
			position: { x: 0, y: 100 },
			width: 40,
			height: 40,
			data: { number: "", initial: true },
		} as any;

		store.getState().workflowManager.addDroppedNode(secondInitial);

		expect(store.getState().grafcet.getElementById("dropped")).toBeUndefined();
	});
});

describe("GrafcetWorkflowManager.handleNodesChange: auto-connection at the end of a move", () => {
	function buildStoreWithFreeTransition() {
		const grafcet = new GrafcetBuilder()
			.addStep(
				new StepBuilder().id("s").number(1).initial().position(0, 0).build(),
			)
			.addTransition(new TransitionBuilder().id("t").position(300, 300).build())
			.addTransition(
				new TransitionBuilder().id("t2").position(500, 300).build(),
			)
			.build();
		return createGrafcetStore(
			grafcet,
			new CommandsStack<Grafcet>(100),
			() => Dialect.FR,
		);
	}

	const move = (id: string, x: number, y: number, dragging: boolean) =>
		({
			type: "position",
			id,
			position: { x, y },
			dragging,
		}) as any;

	it("links the moved node when it comes to rest next to a compatible one", () => {
		const store = buildStoreWithFreeTransition();

		store
			.getState()
			.workflowManager.handleNodesChange([move("t", 0, 50, false)]);

		const connection = store.getState().grafcet.getConnection("s", "t");
		expect(connection!.source.handle).toBe("source:successor");
		expect(connection!.target.handle).toBe("target:predecessor");
	});

	it("corrects the final position of a node released over its neighbour", () => {
		const store = buildStoreWithFreeTransition();

		store
			.getState()
			.workflowManager.handleNodesChange([move("t", 0, 35, false)]);

		const grafcet = store.getState().grafcet;
		expect(grafcet.getElementById("t")!.position).toEqual({ x: 0, y: 40 });
		expect(grafcet.getConnection("s", "t")).toBeDefined();
		expect(store.getState().nodes.find((n) => n.id === "t")!.position).toEqual({
			x: 0,
			y: 40,
		});
	});

	it("leaves the position untouched when nothing gets linked", () => {
		const store = buildStoreWithFreeTransition();

		store
			.getState()
			.workflowManager.handleNodesChange([move("t", 0, 35.5 + 100, false)]);

		expect(store.getState().grafcet.getElementById("t")!.position).toEqual({
			x: 0,
			y: 135.5,
		});
	});

	it("links nothing while the node is still being dragged", () => {
		const store = buildStoreWithFreeTransition();

		store
			.getState()
			.workflowManager.handleNodesChange([move("t", 0, 50, true)]);

		expect(store.getState().grafcet.connections).toHaveLength(0);
	});

	it("undoes the move and the link in a single operation", () => {
		const store = buildStoreWithFreeTransition();
		store
			.getState()
			.workflowManager.handleNodesChange([move("t", 0, 50, false)]);

		store.getState().commandsStackManager.undoOperation();

		expect(store.getState().grafcet.connections).toHaveLength(0);
		expect(store.getState().grafcet.getElementById("t")!.position).toEqual({
			x: 300,
			y: 300,
		});
	});

	it("links nothing when the node ends up where it started", () => {
		const grafcet = new GrafcetBuilder()
			.addStep(
				new StepBuilder().id("s").number(1).initial().position(0, 0).build(),
			)
			.addTransition(new TransitionBuilder().id("t").position(0, 50).build())
			.build();
		const store = createGrafcetStore(
			grafcet,
			new CommandsStack<Grafcet>(100),
			() => Dialect.FR,
		);

		store
			.getState()
			.workflowManager.handleNodesChange([move("t", 0, 50, false)]);

		expect(store.getState().grafcet.connections).toHaveLength(0);
	});

	it("links nothing when several nodes are moved together", () => {
		const store = buildStoreWithFreeTransition();

		store
			.getState()
			.workflowManager.handleNodesChange([
				move("t", 0, 50, false),
				move("t2", 500, 310, false),
			]);

		expect(store.getState().grafcet.connections).toHaveLength(0);
	});
});

describe("GrafcetWorkflowManager.handleNodesChange: actions follow their step", () => {
	// step "s" en (100, 100), actions "a1" en (180, 100) et "a2" en (180, 160) ; "free" n'est liée à rien
	function buildStoreWithActions() {
		const grafcet = new GrafcetBuilder()
			.addStep(
				new StepBuilder()
					.id("s")
					.number(1)
					.initial()
					.position(100, 100)
					.build(),
			)
			.addStep(
				new StepBuilder().id("other").number(2).position(400, 100).build(),
			)
			.addAction(new ActionBuilder().id("a1").position(180, 100).build())
			.addAction(new ActionBuilder().id("a2").position(180, 160).build())
			.addAction(new ActionBuilder().id("free").position(600, 300).build())
			.addConnection(
				new ConnectionBuilder()
					.id("c1")
					.source("step", "s", "source:action")
					.target("action", "a1", "target:predecessor")
					.build(),
			)
			.addConnection(
				new ConnectionBuilder()
					.id("c2")
					.source("step", "s", "source:action")
					.target("action", "a2", "target:predecessor")
					.build(),
			)
			.build();
		return createGrafcetStore(
			grafcet,
			new CommandsStack<Grafcet>(100),
			() => Dialect.FR,
		);
	}

	const move = (id: string, x: number, y: number, dragging: boolean) =>
		({ type: "position", id, position: { x, y }, dragging }) as any;
	const nodePosition = (
		store: ReturnType<typeof buildStoreWithActions>,
		id: string,
	) => store.getState().nodes.find((n) => n.id === id)!.position;
	const elementPosition = (
		store: ReturnType<typeof buildStoreWithActions>,
		id: string,
	) => store.getState().grafcet.getElementById(id)!.position;

	it("moves the actions of a step along while it is dragged", () => {
		const store = buildStoreWithActions();

		store
			.getState()
			.workflowManager.handleNodesChange([move("s", 100, 130, true)]);

		expect(nodePosition(store, "a1")).toEqual({ x: 180, y: 130 });
		expect(nodePosition(store, "a2")).toEqual({ x: 180, y: 190 });
		expect(elementPosition(store, "a1")).toEqual({ x: 180, y: 100 });
	});

	it("follows the displacement of each successive drag event", () => {
		const store = buildStoreWithActions();
		const { workflowManager } = store.getState();

		workflowManager.handleNodesChange([move("s", 100, 110, true)]);
		workflowManager.handleNodesChange([move("s", 100, 140, true)]);

		expect(nodePosition(store, "a1")).toEqual({ x: 180, y: 140 });
	});

	it("saves the actions with the step when it is released", () => {
		const store = buildStoreWithActions();
		const { workflowManager } = store.getState();

		workflowManager.handleNodesChange([move("s", 100, 130, true)]);
		workflowManager.handleNodesChange([move("s", 100, 130, false)]);

		expect(elementPosition(store, "s")).toEqual({ x: 100, y: 130 });
		expect(elementPosition(store, "a1")).toEqual({ x: 180, y: 130 });
		expect(elementPosition(store, "a2")).toEqual({ x: 180, y: 190 });
	});

	it("undoes the move of the step and of its actions in a single operation", () => {
		const store = buildStoreWithActions();
		const { workflowManager } = store.getState();
		workflowManager.handleNodesChange([move("s", 100, 130, true)]);
		workflowManager.handleNodesChange([move("s", 100, 130, false)]);

		store.getState().commandsStackManager.undoOperation();

		expect(elementPosition(store, "s")).toEqual({ x: 100, y: 100 });
		expect(elementPosition(store, "a1")).toEqual({ x: 180, y: 100 });
		expect(elementPosition(store, "a2")).toEqual({ x: 180, y: 160 });
	});

	it("does not move the actions horizontally", () => {
		const store = buildStoreWithActions();
		const { workflowManager } = store.getState();

		workflowManager.handleNodesChange([move("s", 60, 100, true)]);
		workflowManager.handleNodesChange([move("s", 60, 100, false)]);

		expect(elementPosition(store, "s")).toEqual({ x: 60, y: 100 });
		expect(elementPosition(store, "a1")).toEqual({ x: 180, y: 100 });
		expect(elementPosition(store, "a2")).toEqual({ x: 180, y: 160 });
	});

	it("only moves vertically when the step moves in both directions", () => {
		const store = buildStoreWithActions();
		const { workflowManager } = store.getState();

		workflowManager.handleNodesChange([move("s", 60, 130, true)]);
		workflowManager.handleNodesChange([move("s", 60, 130, false)]);

		expect(elementPosition(store, "a1")).toEqual({ x: 180, y: 130 });
	});

	it("puts the actions back when the step is released where it started", () => {
		const store = buildStoreWithActions();
		const { workflowManager } = store.getState();

		workflowManager.handleNodesChange([move("s", 100, 130, true)]);
		workflowManager.handleNodesChange([move("s", 100, 100, false)]);

		expect(nodePosition(store, "a1")).toEqual({ x: 180, y: 100 });
		expect(nodePosition(store, "a2")).toEqual({ x: 180, y: 160 });
	});

	it("leaves the actions of other steps and the unlinked actions alone", () => {
		const store = buildStoreWithActions();
		const { workflowManager } = store.getState();

		workflowManager.handleNodesChange([move("s", 100, 130, true)]);
		workflowManager.handleNodesChange([move("s", 100, 130, false)]);

		expect(elementPosition(store, "free")).toEqual({ x: 600, y: 300 });
		expect(elementPosition(store, "other")).toEqual({ x: 400, y: 100 });
	});

	it("does not move an action again when it is moved in the same change", () => {
		const store = buildStoreWithActions();
		const { workflowManager } = store.getState();

		workflowManager.handleNodesChange([
			move("s", 100, 130, false),
			move("a1", 180, 130, false),
		]);

		expect(elementPosition(store, "a1")).toEqual({ x: 180, y: 130 });
		expect(elementPosition(store, "a2")).toEqual({ x: 180, y: 190 });
	});

	it("does not move the actions when the action directly to the right is not on the row of the step", () => {
		const grafcet = new GrafcetBuilder()
			.addStep(
				new StepBuilder()
					.id("s")
					.number(1)
					.initial()
					.position(100, 100)
					.build(),
			)
			.addAction(new ActionBuilder().id("a").position(180, 200).build())
			.addConnection(
				new ConnectionBuilder()
					.id("c")
					.source("step", "s", "source:action")
					.target("action", "a", "target:predecessor")
					.build(),
			)
			.build();
		const store = createGrafcetStore(
			grafcet,
			new CommandsStack<Grafcet>(100),
			() => Dialect.FR,
		);

		store
			.getState()
			.workflowManager.handleNodesChange([move("s", 100, 130, false)]);

		expect(elementPosition(store, "a")).toEqual({ x: 180, y: 200 });
	});

	describe("an action that is not on the row of its step at the start", () => {
		// step "s" en (100, 100), action "a" en (180, 300)
		function buildStoreWithDistantAction() {
			const grafcet = new GrafcetBuilder()
				.addStep(
					new StepBuilder()
						.id("s")
						.number(1)
						.initial()
						.position(100, 100)
						.build(),
				)
				.addAction(new ActionBuilder().id("a").position(180, 300).build())
				.addConnection(
					new ConnectionBuilder()
						.id("c")
						.source("step", "s", "source:action")
						.target("action", "a", "target:predecessor")
						.build(),
				)
				.build();
			return createGrafcetStore(
				grafcet,
				new CommandsStack<Grafcet>(100),
				() => Dialect.FR,
			);
		}

		it("does not follow before the step reaches its row", () => {
			const store = buildStoreWithDistantAction();
			const { workflowManager } = store.getState();

			workflowManager.handleNodesChange([move("s", 100, 150, true)]);
			workflowManager.handleNodesChange([move("s", 100, 200, true)]);

			expect(nodePosition(store, "a")).toEqual({ x: 180, y: 300 });
		});

		it("starts to follow once the step is on its row", () => {
			const store = buildStoreWithDistantAction();
			const { workflowManager } = store.getState();

			workflowManager.handleNodesChange([move("s", 100, 200, true)]);
			workflowManager.handleNodesChange([move("s", 100, 300, true)]);
			// the step is now aligned: the next displacement carries the action
			workflowManager.handleNodesChange([move("s", 100, 320, true)]);

			expect(nodePosition(store, "a")).toEqual({ x: 180, y: 320 });
		});

		it("does not follow when the step only comes within a grid cell of its row", () => {
			const store = buildStoreWithDistantAction();
			const { workflowManager } = store.getState();

			workflowManager.handleNodesChange([move("s", 100, 290, true)]);
			workflowManager.handleNodesChange([move("s", 100, 310, true)]);

			expect(nodePosition(store, "a")).toEqual({ x: 180, y: 300 });
		});

		it("saves the action where it was carried when the step is released", () => {
			const store = buildStoreWithDistantAction();
			const { workflowManager } = store.getState();

			workflowManager.handleNodesChange([move("s", 100, 300, true)]);
			workflowManager.handleNodesChange([move("s", 100, 340, true)]);
			workflowManager.handleNodesChange([move("s", 100, 340, false)]);

			expect(elementPosition(store, "s")).toEqual({ x: 100, y: 340 });
			expect(elementPosition(store, "a")).toEqual({ x: 180, y: 340 });
		});

		it("undoes the step and the action carried along in a single operation", () => {
			const store = buildStoreWithDistantAction();
			const { workflowManager } = store.getState();
			workflowManager.handleNodesChange([move("s", 100, 300, true)]);
			workflowManager.handleNodesChange([move("s", 100, 340, true)]);
			workflowManager.handleNodesChange([move("s", 100, 340, false)]);

			store.getState().commandsStackManager.undoOperation();

			expect(elementPosition(store, "s")).toEqual({ x: 100, y: 100 });
			expect(elementPosition(store, "a")).toEqual({ x: 180, y: 300 });
		});

		it("leaves the action where it is when the step is released before reaching its row", () => {
			const store = buildStoreWithDistantAction();
			const { workflowManager } = store.getState();

			workflowManager.handleNodesChange([move("s", 100, 200, true)]);
			workflowManager.handleNodesChange([move("s", 100, 200, false)]);

			expect(elementPosition(store, "a")).toEqual({ x: 180, y: 300 });
		});

		it("stops following when it is no longer on the row, and keeps the position it reached", () => {
			const store = buildStoreWithDistantAction();
			const { workflowManager } = store.getState();

			workflowManager.handleNodesChange([move("s", 100, 300, true)]);
			workflowManager.handleNodesChange([move("s", 100, 340, true)]);
			// page height 1400 (mocked): the action stops at y = 1358 while the step goes on
			workflowManager.handleNodesChange([move("s", 100, 1390, true)]);
			workflowManager.handleNodesChange([move("s", 100, 1395, true)]);
			workflowManager.handleNodesChange([move("s", 100, 1395, false)]);

			expect(elementPosition(store, "a")).toEqual({ x: 180, y: 1358 });
		});
	});

	it("moving an action alone does not move its step or the other actions", () => {
		const store = buildStoreWithActions();
		const { workflowManager } = store.getState();

		workflowManager.handleNodesChange([move("a1", 180, 130, true)]);
		workflowManager.handleNodesChange([move("a1", 180, 130, false)]);

		expect(elementPosition(store, "s")).toEqual({ x: 100, y: 100 });
		expect(elementPosition(store, "a2")).toEqual({ x: 180, y: 160 });
	});

	it("keeps the actions inside the page", () => {
		const store = buildStoreWithActions();
		const { workflowManager } = store.getState();

		// page height 1400 (mocked), action height 40, extent bottom = 1398
		workflowManager.handleNodesChange([move("s", 100, 1300, true)]);
		workflowManager.handleNodesChange([move("s", 100, 1300, false)]);

		expect(elementPosition(store, "a1")).toEqual({ x: 180, y: 1300 });
		expect(elementPosition(store, "a2").y).toBe(1358);
	});

	it("pins an action taller than the page to the top edge", () => {
		const grafcet = new GrafcetBuilder()
			.addStep(
				new StepBuilder()
					.id("s")
					.number(1)
					.initial()
					.position(100, 100)
					.build(),
			)
			.addAction(
				new ActionBuilder()
					.id("tall")
					.position(180, 100 + Step.DEFAULT_DIMENSIONS.height / 2 - 750)
					.dimensions(80, 1500)
					.build(),
			)
			.addConnection(
				new ConnectionBuilder()
					.id("c")
					.source("step", "s", "source:action")
					.target("action", "tall", "target:predecessor")
					.build(),
			)
			.build();
		const store = createGrafcetStore(
			grafcet,
			new CommandsStack<Grafcet>(100),
			() => Dialect.FR,
		);
		const { workflowManager } = store.getState();

		workflowManager.handleNodesChange([move("s", 100, 130, true)]);
		workflowManager.handleNodesChange([move("s", 100, 130, false)]);

		expect(elementPosition(store, "tall").y).toBe(0);
	});

	it("moves the actions with the step corrected by the automatic link", () => {
		const grafcet = new GrafcetBuilder()
			.addStep(
				new StepBuilder()
					.id("s")
					.number(1)
					.initial()
					.position(100, 300)
					.build(),
			)
			.addAction(new ActionBuilder().id("a").position(180, 300).build())
			.addTransition(new TransitionBuilder().id("t").position(100, 100).build())
			.addConnection(
				new ConnectionBuilder()
					.id("c")
					.source("step", "s", "source:action")
					.target("action", "a", "target:predecessor")
					.build(),
			)
			.build();
		const store = createGrafcetStore(
			grafcet,
			new CommandsStack<Grafcet>(100),
			() => Dialect.FR,
		);

		// transition bottom = 130: the step released at y=125 is brought back to y=130
		store
			.getState()
			.workflowManager.handleNodesChange([move("s", 100, 125, false)]);

		expect(elementPosition(store, "s")).toEqual({ x: 100, y: 130 });
		expect(elementPosition(store, "a")).toEqual({ x: 180, y: 130 });
		expect(store.getState().grafcet.getConnection("t", "s")).toBeDefined();
	});
});

describe("GrafcetWorkflowManager.handleNodesChange: step referrals follow their transition or step", () => {
	// t (100, 100) -> rs (100, 140) ; rt (300, 60) -> s (300, 100) ; "free" is linked to nothing
	function buildStoreWithReferrals() {
		const grafcet = new GrafcetBuilder()
			.addTransition(new TransitionBuilder().id("t").position(100, 100).build())
			.addStepReferralSource(
				new StepReferralSourceBuilder().id("rs").position(100, 140).build(),
			)
			.addStep(
				new StepBuilder()
					.id("s")
					.number(1)
					.initial()
					.position(300, 100)
					.build(),
			)
			.addStepReferralTarget(
				new StepReferralTargetBuilder().id("rt").position(300, 40).build(),
			)
			.addStepReferralSource(
				new StepReferralSourceBuilder().id("free").position(500, 500).build(),
			)
			.addConnection(
				new ConnectionBuilder()
					.id("c1")
					.source("transition", "t", "source:successor")
					.target("step-referral-source", "rs", "target:predecessor")
					.build(),
			)
			.addConnection(
				new ConnectionBuilder()
					.id("c2")
					.source("step-referral-target", "rt", "source:successor")
					.target("step", "s", "target:predecessor")
					.build(),
			)
			.build();
		return createGrafcetStore(
			grafcet,
			new CommandsStack<Grafcet>(100),
			() => Dialect.FR,
		);
	}
	type Store = ReturnType<typeof buildStoreWithReferrals>;

	const move = (id: string, x: number, y: number, dragging: boolean) =>
		({ type: "position", id, position: { x, y }, dragging }) as any;
	const nodePosition = (store: Store, id: string) =>
		store.getState().nodes.find((n) => n.id === id)!.position;
	const elementPosition = (store: Store, id: string) =>
		store.getState().grafcet.getElementById(id)!.position;

	it("moves the referral of a transition along horizontally only while it is dragged", () => {
		const store = buildStoreWithReferrals();

		store
			.getState()
			.workflowManager.handleNodesChange([move("t", 130, 160, true)]);

		expect(nodePosition(store, "rs")).toEqual({ x: 130, y: 140 });
		expect(elementPosition(store, "rs")).toEqual({ x: 100, y: 140 });
	});

	it("saves the referral of a transition with it when it is released", () => {
		const store = buildStoreWithReferrals();
		const { workflowManager } = store.getState();

		workflowManager.handleNodesChange([move("t", 130, 160, true)]);
		workflowManager.handleNodesChange([move("t", 130, 160, false)]);

		expect(elementPosition(store, "t")).toEqual({ x: 130, y: 160 });
		expect(elementPosition(store, "rs")).toEqual({ x: 130, y: 140 });
	});

	it("moves the referral that leads to a step along horizontally only", () => {
		const store = buildStoreWithReferrals();
		const { workflowManager } = store.getState();

		workflowManager.handleNodesChange([move("s", 280, 150, true)]);
		workflowManager.handleNodesChange([move("s", 280, 150, false)]);

		expect(elementPosition(store, "rt")).toEqual({ x: 280, y: 40 });
	});

	it("does not move the referral when its transition only moves vertically", () => {
		const store = buildStoreWithReferrals();
		const { workflowManager } = store.getState();

		workflowManager.handleNodesChange([move("t", 100, 160, true)]);
		workflowManager.handleNodesChange([move("t", 100, 160, false)]);

		expect(elementPosition(store, "rs")).toEqual({ x: 100, y: 140 });
	});

	it("undoes the move of the transition and of its referral in a single operation", () => {
		const store = buildStoreWithReferrals();
		const { workflowManager } = store.getState();
		workflowManager.handleNodesChange([move("t", 130, 160, false)]);

		store.getState().commandsStackManager.undoOperation();

		expect(elementPosition(store, "t")).toEqual({ x: 100, y: 100 });
		expect(elementPosition(store, "rs")).toEqual({ x: 100, y: 140 });
	});

	it("puts the referral back when the transition is released where it started", () => {
		const store = buildStoreWithReferrals();
		const { workflowManager } = store.getState();

		workflowManager.handleNodesChange([move("t", 130, 160, true)]);
		workflowManager.handleNodesChange([move("t", 100, 100, false)]);

		expect(nodePosition(store, "rs")).toEqual({ x: 100, y: 140 });
	});

	it("moving a referral alone moves nothing else", () => {
		const store = buildStoreWithReferrals();
		const { workflowManager } = store.getState();

		workflowManager.handleNodesChange([move("rs", 150, 200, true)]);
		workflowManager.handleNodesChange([move("rs", 150, 200, false)]);

		expect(elementPosition(store, "t")).toEqual({ x: 100, y: 100 });
		expect(elementPosition(store, "rs")).toEqual({ x: 150, y: 200 });
	});

	it("leaves the unlinked referrals alone", () => {
		const store = buildStoreWithReferrals();
		const { workflowManager } = store.getState();

		workflowManager.handleNodesChange([move("t", 130, 160, false)]);
		workflowManager.handleNodesChange([move("s", 280, 150, false)]);

		expect(elementPosition(store, "free")).toEqual({ x: 500, y: 500 });
	});

	it("does not move a referral again when it is moved in the same change", () => {
		const store = buildStoreWithReferrals();

		store
			.getState()
			.workflowManager.handleNodesChange([
				move("t", 130, 160, false),
				move("rs", 130, 200, false),
			]);

		expect(elementPosition(store, "rs")).toEqual({ x: 130, y: 200 });
	});

	it("keeps the referral inside the page", () => {
		const store = buildStoreWithReferrals();
		const { workflowManager } = store.getState();

		// page 1000 x 1400 (mocked), referral 40 x 40: its right limit is x = 958
		workflowManager.handleNodesChange([move("t", 1100, 100, false)]);

		expect(elementPosition(store, "rs").x).toBe(958);
	});

	it("moves the actions and the referral of a step together", () => {
		const grafcet = new GrafcetBuilder()
			.addStep(
				new StepBuilder()
					.id("s")
					.number(1)
					.initial()
					.position(300, 100)
					.build(),
			)
			.addStepReferralTarget(
				new StepReferralTargetBuilder().id("rt").position(300, 40).build(),
			)
			.addAction(new ActionBuilder().id("a").position(380, 100).build())
			.addConnection(
				new ConnectionBuilder()
					.id("c1")
					.source("step-referral-target", "rt", "source:successor")
					.target("step", "s", "target:predecessor")
					.build(),
			)
			.addConnection(
				new ConnectionBuilder()
					.id("c2")
					.source("step", "s", "source:action")
					.target("action", "a", "target:predecessor")
					.build(),
			)
			.build();
		const store = createGrafcetStore(
			grafcet,
			new CommandsStack<Grafcet>(100),
			() => Dialect.FR,
		);

		store
			.getState()
			.workflowManager.handleNodesChange([move("s", 320, 150, false)]);

		expect(elementPosition(store, "rt")).toEqual({ x: 320, y: 40 });
		expect(elementPosition(store, "a")).toEqual({ x: 380, y: 150 });
	});
});

describe("GrafcetWorkflowManager.handleNodesChange: a step referral that is not in the column at the start", () => {
	// transition "t" en (100, 100), renvoi "rs" en (300, 140) ; étape "s" en (100, 300), renvoi "rt" en (300, 240)
	function buildStoreWithDistantReferrals() {
		const grafcet = new GrafcetBuilder()
			.addTransition(new TransitionBuilder().id("t").position(100, 100).build())
			.addStepReferralSource(
				new StepReferralSourceBuilder().id("rs").position(300, 140).build(),
			)
			.addStep(
				new StepBuilder()
					.id("s")
					.number(1)
					.initial()
					.position(100, 300)
					.build(),
			)
			.addStepReferralTarget(
				new StepReferralTargetBuilder().id("rt").position(300, 240).build(),
			)
			.addConnection(
				new ConnectionBuilder()
					.id("c1")
					.source("transition", "t", "source:successor")
					.target("step-referral-source", "rs", "target:predecessor")
					.build(),
			)
			.addConnection(
				new ConnectionBuilder()
					.id("c2")
					.source("step-referral-target", "rt", "source:successor")
					.target("step", "s", "target:predecessor")
					.build(),
			)
			.build();
		return createGrafcetStore(
			grafcet,
			new CommandsStack<Grafcet>(100),
			() => Dialect.FR,
		);
	}
	type Store = ReturnType<typeof buildStoreWithDistantReferrals>;

	const move = (id: string, x: number, y: number, dragging: boolean) =>
		({ type: "position", id, position: { x, y }, dragging }) as any;
	const nodePosition = (store: Store, id: string) =>
		store.getState().nodes.find((n) => n.id === id)!.position;
	const elementPosition = (store: Store, id: string) =>
		store.getState().grafcet.getElementById(id)!.position;

	it.each([
		["transition", "t", "rs", 140],
		["step", "s", "rt", 240],
	])(
		"does not follow the %s before it reaches its column",
		(_, movedId, referralId, referralY) => {
			const store = buildStoreWithDistantReferrals();
			const { workflowManager } = store.getState();

			workflowManager.handleNodesChange([move(movedId, 150, 100, true)]);
			workflowManager.handleNodesChange([move(movedId, 250, 100, true)]);

			expect(nodePosition(store, referralId)).toEqual({
				x: 300,
				y: referralY,
			});
		},
	);

	it("starts to follow a transition once it is in the column", () => {
		const store = buildStoreWithDistantReferrals();
		const { workflowManager } = store.getState();

		workflowManager.handleNodesChange([move("t", 200, 100, true)]);
		workflowManager.handleNodesChange([move("t", 300, 100, true)]);
		workflowManager.handleNodesChange([move("t", 340, 100, true)]);

		expect(nodePosition(store, "rs")).toEqual({ x: 340, y: 140 });
	});

	it("starts to follow a step once it is in the column", () => {
		const store = buildStoreWithDistantReferrals();
		const { workflowManager } = store.getState();

		workflowManager.handleNodesChange([move("s", 200, 300, true)]);
		workflowManager.handleNodesChange([move("s", 300, 300, true)]);
		workflowManager.handleNodesChange([move("s", 340, 300, true)]);

		expect(nodePosition(store, "rt")).toEqual({ x: 340, y: 240 });
	});

	it("saves the referral where it was carried when the transition is released", () => {
		const store = buildStoreWithDistantReferrals();
		const { workflowManager } = store.getState();

		workflowManager.handleNodesChange([move("t", 300, 100, true)]);
		workflowManager.handleNodesChange([move("t", 360, 100, true)]);
		workflowManager.handleNodesChange([move("t", 360, 100, false)]);

		expect(elementPosition(store, "t")).toEqual({ x: 360, y: 100 });
		expect(elementPosition(store, "rs")).toEqual({ x: 360, y: 140 });
	});

	it("undoes the transition and the referral carried along in a single operation", () => {
		const store = buildStoreWithDistantReferrals();
		const { workflowManager } = store.getState();
		workflowManager.handleNodesChange([move("t", 300, 100, true)]);
		workflowManager.handleNodesChange([move("t", 360, 100, true)]);
		workflowManager.handleNodesChange([move("t", 360, 100, false)]);

		store.getState().commandsStackManager.undoOperation();

		expect(elementPosition(store, "t")).toEqual({ x: 100, y: 100 });
		expect(elementPosition(store, "rs")).toEqual({ x: 300, y: 140 });
	});

	it("leaves the referral where it is when the step is released before reaching its column", () => {
		const store = buildStoreWithDistantReferrals();
		const { workflowManager } = store.getState();

		workflowManager.handleNodesChange([move("s", 200, 300, true)]);
		workflowManager.handleNodesChange([move("s", 200, 300, false)]);

		expect(elementPosition(store, "rt")).toEqual({ x: 300, y: 240 });
	});

	it("does not follow when the transition only comes within a grid cell of the column", () => {
		const store = buildStoreWithDistantReferrals();
		const { workflowManager } = store.getState();

		workflowManager.handleNodesChange([move("t", 290, 100, true)]);
		workflowManager.handleNodesChange([move("t", 310, 100, true)]);

		expect(nodePosition(store, "rs")).toEqual({ x: 300, y: 140 });
	});
});

describe("GrafcetWorkflowManager.handleNodesChange: chained actions follow a moved action", () => {
	// s → a1 → a2 on the row of s; b linked directly to s, below
	function buildStoreWithChain() {
		const grafcet = new GrafcetBuilder()
			.addStep(
				new StepBuilder()
					.id("s")
					.number(1)
					.initial()
					.position(100, 100)
					.build(),
			)
			.addAction(new ActionBuilder().id("a1").position(180, 100).build())
			.addAction(new ActionBuilder().id("a2").position(280, 100).build())
			.addAction(new ActionBuilder().id("b").position(180, 160).build())
			.addConnections(
				actionLink("step", "s", "a1"),
				actionLink("action", "a1", "a2"),
				actionLink("step", "s", "b"),
			)
			.build();
		return createGrafcetStore(
			grafcet,
			new CommandsStack<Grafcet>(100),
			() => Dialect.FR,
		);
	}

	const move = (id: string, x: number, y: number, dragging: boolean) =>
		({ type: "position", id, position: { x, y }, dragging }) as any;
	const elementPosition = (
		store: ReturnType<typeof buildStoreWithChain>,
		id: string,
	) => store.getState().grafcet.getElementById(id)!.position;

	it("moves the actions chained after the moved one, not the other actions of the step, in a single operation", () => {
		const store = buildStoreWithChain();
		const { workflowManager } = store.getState();

		workflowManager.handleNodesChange([move("a1", 180, 130, true)]);
		workflowManager.handleNodesChange([move("a1", 180, 130, false)]);

		expect(elementPosition(store, "a1")).toEqual({ x: 180, y: 130 });
		expect(elementPosition(store, "a2")).toEqual({ x: 280, y: 130 });
		expect(elementPosition(store, "b")).toEqual({ x: 180, y: 160 });

		store.getState().commandsStackManager.undoOperation();

		expect(elementPosition(store, "a1")).toEqual({ x: 180, y: 100 });
		expect(elementPosition(store, "a2")).toEqual({ x: 280, y: 100 });
	});
});
