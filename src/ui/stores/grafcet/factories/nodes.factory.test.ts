import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import { StepData } from "@/schemas/grafcet/step.schema";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import { GrafcetNodeType } from "@/ui/components/grafcet/flow/grafcet-nodes-definitions";
import NodesFactory from "./nodes.factory";

function grafcetWithSteps(...numbers: number[]) {
	const builder = new GrafcetBuilder();
	numbers.forEach((n) =>
		builder.addStep(new StepBuilder().id(`step-${n}`).number(n).build()),
	);
	return builder.build();
}

describe("NodesFactory.syncNodes", () => {
	describe("construction depuis rien", () => {
		it("crée un nœud par élément", () => {
			const nodes = NodesFactory.syncNodes([], grafcetWithSteps(1, 2));

			expect(nodes).toHaveLength(2);
			expect(nodes.map((n) => n.id).sort()).toEqual(["step-1", "step-2"]);
		});

		it("getInitialNodes est le cas particulier d'une vue vide", () => {
			const grafcet = grafcetWithSteps(1, 2);

			expect(NodesFactory.getInitialNodes(grafcet)).toEqual(
				NodesFactory.syncNodes([], grafcet),
			);
		});
	});

	// Le point qui compte : un nœud sélectionné ne doit pas se déselectionner
	describe("préservation de l'état de vue", () => {
		it("conserve la sélection quand l'élément ne change pas", () => {
			const grafcet = grafcetWithSteps(1);
			const prev = NodesFactory.syncNodes([], grafcet).map((n) => ({
				...n,
				selected: true,
			}));

			const nodes = NodesFactory.syncNodes(prev, grafcet);

			expect(nodes[0].selected).toBe(true);
		});

		it("conserve la sélection même quand l'élément change", () => {
			const grafcet = grafcetWithSteps(1);
			const prev = NodesFactory.syncNodes([], grafcet).map((n) => ({
				...n,
				selected: true,
			}));
			Object.values(grafcet.steps)[0].data.number = 42;

			const nodes = NodesFactory.syncNodes(prev, grafcet);

			expect(nodes[0].selected).toBe(true);
			expect((nodes[0].data as StepData).number).toBe(42);
		});

		it("conserve les dimensions mesurées par React Flow lors d'un déplacement", () => {
			// measured et width/height sont écrits par React Flow (NodeResizer) : ils ne
			// doivent pas être perdus quand le domaine repositionne le nœud
			const grafcet = grafcetWithSteps(1);
			const prev = NodesFactory.syncNodes([], grafcet).map((n) => ({
				...n,
				measured: { width: 120, height: 80 },
				width: 120,
				height: 80,
			})) as GrafcetNodeType[];
			Object.values(grafcet.steps)[0].position = { x: 50, y: 60 };

			const nodes = NodesFactory.syncNodes(prev, grafcet) as any[];

			expect(nodes[0].measured).toEqual({ width: 120, height: 80 });
			expect(nodes[0].width).toBe(120);
			expect(nodes[0].height).toBe(80);
			expect(nodes[0].position).toEqual({ x: 50, y: 60 });
		});

		it("conserve un champ de vue inconnu de la factory", () => {
			// Garde-fou : on part du nœud précédent, donc tout champ non géré survit
			const grafcet = grafcetWithSteps(1);
			const prev = NodesFactory.syncNodes([], grafcet).map((n) => ({
				...n,
				unChampFutur: "à conserver",
			})) as any[];
			Object.values(grafcet.steps)[0].data.number = 7;

			const nodes = NodesFactory.syncNodes(prev, grafcet) as any[];

			expect(nodes[0].unChampFutur).toBe("à conserver");
		});
	});

	describe("geste en cours (glisser / redimensionner)", () => {
		it("ne replace pas un nœud en cours de déplacement", () => {
			// Le domaine ne reçoit la position qu'à la fin du geste : se réaligner dessus
			// ferait sauter le nœud sous le curseur
			const grafcet = grafcetWithSteps(1);
			const prev = NodesFactory.syncNodes([], grafcet).map((n) => ({
				...n,
				position: { x: 300, y: 300 },
				dragging: true,
			})) as GrafcetNodeType[];

			const nodes = NodesFactory.syncNodes(prev, grafcet);

			expect(nodes[0].position).toEqual({ x: 300, y: 300 });
			expect(nodes[0]).toBe(prev[0]);
		});

		it("réaligne la position une fois le geste terminé", () => {
			const grafcet = grafcetWithSteps(1);
			Object.values(grafcet.steps)[0].position = { x: 40, y: 50 };
			const prev = NodesFactory.syncNodes([], grafcet).map((n) => ({
				...n,
				position: { x: 300, y: 300 },
				dragging: false,
			})) as GrafcetNodeType[];

			const nodes = NodesFactory.syncNodes(prev, grafcet);

			expect(nodes[0].position).toEqual({ x: 40, y: 50 });
		});

		it("applique quand même un changement de données pendant un déplacement", () => {
			const grafcet = grafcetWithSteps(1);
			const prev = NodesFactory.syncNodes([], grafcet).map((n) => ({
				...n,
				position: { x: 300, y: 300 },
				dragging: true,
			})) as GrafcetNodeType[];
			Object.values(grafcet.steps)[0].data.number = 8;

			const nodes = NodesFactory.syncNodes(prev, grafcet);

			expect((nodes[0].data as StepData).number).toBe(8);
			expect(nodes[0].position).toEqual({ x: 300, y: 300 });
		});
	});

	describe("préservation de l'identité", () => {
		it("retourne exactement le même objet si rien n'a changé", () => {
			const grafcet = grafcetWithSteps(1, 2);
			const prev = NodesFactory.syncNodes([], grafcet);

			const nodes = NodesFactory.syncNodes(prev, grafcet);

			expect(nodes[0]).toBe(prev[0]);
			expect(nodes[1]).toBe(prev[1]);
		});

		it("ne remplace que le nœud réellement modifié", () => {
			const grafcet = grafcetWithSteps(1, 2);
			const prev = NodesFactory.syncNodes([], grafcet);
			Object.values(grafcet.steps)[0].position = { x: 99, y: 99 };

			const nodes = NodesFactory.syncNodes(prev, grafcet);

			expect(nodes[0]).not.toBe(prev[0]); // déplacé : nouvel objet
			expect(nodes[1]).toBe(prev[1]); // intact : même référence
		});
	});

	describe("ajouts et suppressions", () => {
		it("ajoute un nœud pour un nouvel élément", () => {
			const grafcet = grafcetWithSteps(1);
			const prev = NodesFactory.syncNodes([], grafcet);
			grafcet.addElements([
				{
					type: "step",
					id: "step-2",
					data: { number: 2 },
					position: { x: 0, y: 0 },
				},
			]);

			const nodes = NodesFactory.syncNodes(prev, grafcet);

			expect(nodes).toHaveLength(2);
			expect(nodes[1].id).toBe("step-2");
		});

		it("retire le nœud d'un élément supprimé", () => {
			const grafcet = grafcetWithSteps(1, 2);
			const prev = NodesFactory.syncNodes([], grafcet);
			grafcet.removeElements([{ type: "step", id: "step-1" }]);

			const nodes = NodesFactory.syncNodes(prev, grafcet);

			expect(nodes).toHaveLength(1);
			expect(nodes[0].id).toBe("step-2");
		});
	});

	describe("préservation de l'ordre", () => {
		it("garde l'ordre existant et ajoute les nouveaux à la fin", () => {
			// L'ordre pilote l'empilement dans React Flow : le reconstruire dans l'ordre du
			// domaine changerait silencieusement ce qui est dessiné au-dessus
			const grafcet = new GrafcetBuilder()
				.addStep(new StepBuilder().id("step-1").number(1).build())
				.addTransition(new TransitionBuilder().id("trans-1").build())
				.build();
			const prev = [
				{
					id: "trans-1",
					type: "transition",
					data: {},
					position: { x: 0, y: 0 },
				},
				{ id: "step-1", type: "step", data: {}, position: { x: 0, y: 0 } },
			] as unknown as GrafcetNodeType[];
			grafcet.addElements([
				{
					type: "step",
					id: "step-9",
					data: { number: 9 },
					position: { x: 0, y: 0 },
				},
			]);

			const nodes = NodesFactory.syncNodes(prev, grafcet);

			expect(nodes.map((n) => n.id)).toEqual(["trans-1", "step-1", "step-9"]);
		});
	});
});
