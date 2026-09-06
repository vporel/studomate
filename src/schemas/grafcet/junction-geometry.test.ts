import { JunctionData } from "./junction.schema";
import { normalizeJunctionGeometry } from "./junction-geometry";

function data(positions: number[], pivotPosition: number): JunctionData {
	const branches: JunctionData["branches"] = {};
	const branchesOrder: string[] = [];
	positions.forEach((position, i) => {
		const id = `b${i}`;
		branches[id] = { id, position };
		branchesOrder.push(id);
	});
	return { pivotPosition, branches, branchesOrder };
}

const positionsOf = (d: JunctionData) =>
	d.branchesOrder.map((id) => d.branches[id]!.position);

describe("normalizeJunctionGeometry", () => {
	it("laisse une jonction déjà canonique intacte", () => {
		const result = normalizeJunctionGeometry(data([10, 190], 100), 300, 200);

		expect(positionsOf(result.data)).toEqual([10, 190]);
		expect(result.nodeX).toBe(300);
		expect(result.width).toBe(200);
	});

	it("ramène la première branche à la marge en translatant le bord gauche", () => {
		const result = normalizeJunctionGeometry(data([50, 200], 120), 300, 250);

		// décalage de 40 : bord gauche vers la droite, branches et pivot vers la gauche
		expect(positionsOf(result.data)).toEqual([10, 160]);
		expect(result.data.pivotPosition).toBe(80);
		expect(result.nodeX).toBe(340);
		expect(result.width).toBe(170);
	});

	it("cale la largeur sur la dernière branche", () => {
		const result = normalizeJunctionGeometry(data([10, 120], 60), 0, 400);

		expect(result.width).toBe(130);
	});

	it("ne pousse jamais le bord gauche au-delà de x = 0", () => {
		// première branche sous la marge (donnée abîmée) : le nœud devrait glisser à gauche,
		// mais s'arrête à x = 0.
		const result = normalizeJunctionGeometry(data([4, 190], 100), 2, 200);

		expect(result.nodeX).toBe(0);
	});

	it("garde le pivot dans le nœud", () => {
		const result = normalizeJunctionGeometry(data([80, 260], 90), 0, 300);

		// décalage de 70 → pivot voudrait passer à 20 ; reste ≥ marge
		expect(result.data.pivotPosition).toBeGreaterThanOrEqual(10);
		expect(result.data.pivotPosition).toBeLessThanOrEqual(
			result.width - 10,
		);
	});

	it("aligne les positions sur la grille", () => {
		const result = normalizeJunctionGeometry(data([12, 188], 97), 0, 200);

		for (const p of positionsOf(result.data)) expect(p % 10).toBe(0);
		expect(result.width % 10).toBe(0);
	});

	it("laisse une jonction de moins de deux branches inchangée", () => {
		const one = data([50], 50);
		const result = normalizeJunctionGeometry(one, 100, 200);

		expect(result.data).toBe(one);
		expect(result.nodeX).toBe(100);
	});
});
