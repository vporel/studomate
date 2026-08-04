import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import { GrafcetEdgeType } from "@/ui/components/grafcet/flow/grafcet-nodes-definitions";
import EdgesFactory from "./edges.factory";

function grafcetWithConnection(points: [number, number][] = [[10, 20]]) {
	return new GrafcetBuilder()
		.addStep(new StepBuilder().id("step-1").number(1).build())
		.addTransition(new TransitionBuilder().id("trans-1").build())
		.addConnection(
			new ConnectionBuilder()
				.id("c1")
				.source("step", "step-1", "source:successor")
				.target("transition", "trans-1", "target:predecessor")
				.data(points)
				.build(),
		)
		.build();
}

describe("EdgesFactory.syncEdges", () => {
	it("crée une arête par connexion", () => {
		const edges = EdgesFactory.syncEdges([], grafcetWithConnection());

		expect(edges).toHaveLength(1);
		expect(edges[0].id).toBe("c1");
	});

	// Régression §1.2 : l'annulation d'une suppression de connexion reconstruisait
	// l'arête sans targetHandle ni data
	it("reconstruit une arête complète, targetHandle et data compris", () => {
		const edges = EdgesFactory.syncEdges([], grafcetWithConnection([[10, 20]]));

		expect(edges[0].source).toBe("step-1");
		expect(edges[0].sourceHandle).toBe("source:successor");
		expect(edges[0].target).toBe("trans-1");
		expect(edges[0].targetHandle).toBe("target:predecessor");
		expect(edges[0].data).toEqual({ points: [[10, 20]] });
	});

	it("conserve la sélection d'une arête", () => {
		const grafcet = grafcetWithConnection();
		const prev = EdgesFactory.syncEdges([], grafcet).map((e) => ({ ...e, selected: true }));

		const edges = EdgesFactory.syncEdges(prev, grafcet);

		expect(edges[0].selected).toBe(true);
	});

	it("conserve la sélection quand la connexion change", () => {
		const grafcet = grafcetWithConnection();
		const prev = EdgesFactory.syncEdges([], grafcet).map((e) => ({ ...e, selected: true }));
		grafcet.connections[0].data = { points: [[99, 99]] };

		const edges = EdgesFactory.syncEdges(prev, grafcet);

		expect(edges[0].selected).toBe(true);
		expect(edges[0].data).toEqual({ points: [[99, 99]] });
	});

	it("retourne le même objet si rien n'a changé", () => {
		const grafcet = grafcetWithConnection();
		const prev = EdgesFactory.syncEdges([], grafcet);

		expect(EdgesFactory.syncEdges(prev, grafcet)[0]).toBe(prev[0]);
	});

	it("retire l'arête d'une connexion supprimée", () => {
		const grafcet = grafcetWithConnection();
		const prev = EdgesFactory.syncEdges([], grafcet);
		grafcet.removeConnections([{ sourceId: "step-1", targetId: "trans-1" }]);

		expect(EdgesFactory.syncEdges(prev, grafcet)).toHaveLength(0);
	});

	it("ajoute l'arête d'une nouvelle connexion en fin de liste", () => {
		const grafcet = grafcetWithConnection();
		const prev = EdgesFactory.syncEdges([], grafcet);
		grafcet.addConnections([
			new ConnectionBuilder()
				.id("c2")
				.source("transition", "trans-1", "source:successor")
				.target("step", "step-1", "target:predecessor")
				.build(),
		]);

		const edges = EdgesFactory.syncEdges(prev, grafcet);

		expect(edges.map((e) => e.id)).toEqual(["c1", "c2"]);
		expect(edges[0]).toBe(prev[0]);
	});

	it("getInitialEdges est le cas particulier d'une vue vide", () => {
		const grafcet = grafcetWithConnection();

		expect(EdgesFactory.getInitialEdges(grafcet)).toEqual(
			EdgesFactory.syncEdges([] as GrafcetEdgeType[], grafcet),
		);
	});
});
