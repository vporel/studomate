import Connection from "@/schemas/grafcet/connection.schema";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import { GrafcetEdgeType, GrafcetNodeType } from "@/ui/components/grafcet/flow/grafcet-nodes-definitions";
import ViewManager from "../managers/view.manager";
import ConnectionsCommandsFactory from "./connections-commands.factory";

// `onNodesMovedOrResized` délègue la géométrie à `@xyflow/system` (positions réelles des
// handles) — on ne teste pas ce moteur, seulement que la factory l'invoque correctement et en
// tire les bonnes commandes.
jest.mock("@xyflow/system", () => {
	const actual = jest.requireActual("@xyflow/system");
	return {
		...actual,
		getEdgePosition: jest.fn(() => ({ sourceX: 10, sourceY: 20, targetX: 30, targetY: 40 })),
	};
});

function node(id: string): GrafcetNodeType {
	return { id, type: "step", position: { x: 0, y: 0 }, data: { number: 1, initial: true }, width: 40, height: 40 } as any;
}

function edge(id: string, source: string, target: string, points: [number, number][] = [[0, 0]]): GrafcetEdgeType {
	return { id, source, target, sourceHandle: "out", targetHandle: "in", data: { points } } as any;
}

function buildGrafcetWithConnection() {
	const connection = new Connection(
		"e1",
		{ id: "step-1", type: "step", handle: "out" },
		{ id: "step-2", type: "step", handle: "in" },
		{ points: [[0, 0]] },
	);
	const grafcet = new GrafcetBuilder()
		.id("g1")
		.addStep(new StepBuilder().id("step-1").number(1).initial().position(0, 0).build())
		.addStep(new StepBuilder().id("step-2").number(2).position(0, 100).build())
		.addConnection(connection)
		.build();
	return grafcet;
}

describe("ConnectionsCommandsFactory", () => {
	describe("onEdgesAdd", () => {
		it("crée une commande d'ajout à partir des nouvelles arêtes reliées à des nœuds existants", () => {
			const nodes = [node("step-1"), node("step-2")];
			const newEdges = [edge("e1", "step-1", "step-2")];
			const grafcet = new GrafcetBuilder().id("g1").build();

			const { commands, edgesToAdd } = ConnectionsCommandsFactory.onEdgesAdd(newEdges, nodes, grafcet, []);

			expect(commands).toHaveLength(1);
			expect(edgesToAdd).toEqual(newEdges);
		});

		it("écarte les arêtes déjà présentes de `edgesToAdd`", () => {
			const nodes = [node("step-1"), node("step-2")];
			const newEdge = edge("e1", "step-1", "step-2");
			const grafcet = new GrafcetBuilder().id("g1").build();

			const { edgesToAdd } = ConnectionsCommandsFactory.onEdgesAdd([newEdge], nodes, grafcet, [newEdge]);

			expect(edgesToAdd).toHaveLength(0);
		});

		it("ignore une arête dont le nœud source ou cible est introuvable", () => {
			const nodes = [node("step-1")];
			const newEdges = [edge("e1", "step-1", "inexistant")];
			const grafcet = new GrafcetBuilder().id("g1").build();

			const { commands } = ConnectionsCommandsFactory.onEdgesAdd(newEdges, nodes, grafcet, []);

			expect(commands).toHaveLength(0);
		});
	});

	describe("onEdgesRemove", () => {
		it("crée une commande de suppression pour les connexions correspondantes", () => {
			const grafcet = buildGrafcetWithConnection();

			const { commands, edgesIdsToDelete } = ConnectionsCommandsFactory.onEdgesRemove(["e1"], grafcet);

			expect(commands).toHaveLength(1);
			expect(edgesIdsToDelete).toEqual(["e1"]);
		});

		it("ne crée aucune commande si aucun id ne correspond à une connexion du grafcet", () => {
			const grafcet = buildGrafcetWithConnection();

			const { commands, edgesIdsToDelete } = ConnectionsCommandsFactory.onEdgesRemove(["inexistante"], grafcet);

			expect(commands).toHaveLength(0);
			expect(edgesIdsToDelete).toHaveLength(0);
		});
	});

	describe("onEdgeDataChange", () => {
		it("lève une erreur si l'arête n'existe pas parmi les arêtes fournies", () => {
			const grafcet = buildGrafcetWithConnection();

			expect(() =>
				ConnectionsCommandsFactory.onEdgeDataChange("inexistante", { points: [[1, 1]] }, grafcet, []),
			).toThrow();
		});

		it("lève une erreur si la connexion n'existe pas dans le grafcet", () => {
			const grafcet = new GrafcetBuilder().id("g1").build();
			const existingEdges = [edge("e1", "step-1", "step-2")];

			expect(() =>
				ConnectionsCommandsFactory.onEdgeDataChange("e1", { points: [[1, 1]] }, grafcet, existingEdges),
			).toThrow();
		});

		it("ne crée aucune commande si les nouvelles données sont vides", () => {
			const grafcet = buildGrafcetWithConnection();
			const existingEdges = [edge("e1", "step-1", "step-2")];

			const { commands } = ConnectionsCommandsFactory.onEdgeDataChange("e1", {}, grafcet, existingEdges);

			expect(commands).toHaveLength(0);
		});

		it("crée une commande de mise à jour quand les données changent réellement", () => {
			const grafcet = buildGrafcetWithConnection();
			const existingEdges = [edge("e1", "step-1", "step-2")];

			const { commands, edgeDataToApply } = ConnectionsCommandsFactory.onEdgeDataChange(
				"e1",
				{ points: [[5, 5]] },
				grafcet,
				existingEdges,
			);

			expect(commands).toHaveLength(1);
			expect(edgeDataToApply.points).toEqual([[5, 5]]);
		});

		it("accepte une fonction de mise à jour dérivée des données précédentes", () => {
			const grafcet = buildGrafcetWithConnection();
			const existingEdges = [edge("e1", "step-1", "step-2", [[0, 0]])];

			const { edgeDataToApply } = ConnectionsCommandsFactory.onEdgeDataChange(
				"e1",
				() => ({ points: [[9, 9]] }),
				grafcet,
				existingEdges,
			);

			expect(edgeDataToApply.points).toEqual([[9, 9]]);
		});
	});

	describe("onNodesMovedOrResized", () => {
		function fakeViewManager() {
			const rfInstance = { getInternalNode: jest.fn(() => ({})) };
			const viewManager = new ViewManager(jest.fn(), jest.fn());
			(viewManager as any).rfInstance = rfInstance;
			return viewManager;
		}

		it("ne fait rien sans instance React Flow enregistrée", () => {
			const grafcet = buildGrafcetWithConnection();
			const viewManager = new ViewManager(jest.fn(), jest.fn());

			const { commands, edgesDataToApply } = ConnectionsCommandsFactory.onNodesMovedOrResized(
				["step-1"],
				grafcet,
				viewManager,
			);

			expect(commands).toHaveLength(0);
			expect(edgesDataToApply).toHaveLength(0);
		});

		it("ne fait rien si aucun nœud déplacé n'est fourni", () => {
			const grafcet = buildGrafcetWithConnection();
			const viewManager = fakeViewManager();

			const { commands } = ConnectionsCommandsFactory.onNodesMovedOrResized([], grafcet, viewManager);

			expect(commands).toHaveLength(0);
		});

		it("recalcule les points des connexions attachées aux nœuds déplacés", () => {
			const grafcet = buildGrafcetWithConnection();
			const viewManager = fakeViewManager();

			const { commands, edgesDataToApply } = ConnectionsCommandsFactory.onNodesMovedOrResized(
				["step-1"],
				grafcet,
				viewManager,
			);

			expect(edgesDataToApply).toHaveLength(1);
			expect(edgesDataToApply[0].edgeId).toBe("e1");
			// Un seul point de départ : la seconde `splice` (bornage sur la cible) écrase le premier,
			// c'est le comportement existant de la factory pour une connexion à un seul point.
			expect(edgesDataToApply[0].newData!.points[0]).toEqual([30, 40]);
			expect(commands).toHaveLength(1);
		});

		it("ignore les connexions non liées aux nœuds déplacés", () => {
			const grafcet = buildGrafcetWithConnection();
			const viewManager = fakeViewManager();

			const { edgesDataToApply } = ConnectionsCommandsFactory.onNodesMovedOrResized(
				["step-inexistant"],
				grafcet,
				viewManager,
			);

			expect(edgesDataToApply).toHaveLength(0);
		});
	});
});
