import { JunctionData } from "@/schemas/grafcet/junction.schema";
import resolveExtremeBranchDrag from "./junction-extreme-branch-drag";

const PAGE_WIDTH = 794;

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

const positionsOf = (branches: JunctionData["branches"], order: string[]) =>
	order.map((id) => branches[id]!.position);

describe("resolveExtremeBranchDrag — première branche", () => {
	const baseline = { data: data([10, 190], 100), nodeX: 300, width: 200 };
	const order = baseline.data.branchesOrder;

	it("élargit la jonction par la gauche : bord gauche et largeur suivent", () => {
		const r = resolveExtremeBranchDrag(baseline, "first", -30, PAGE_WIDTH);

		expect(positionsOf(r.branches, order)).toEqual([10, 220]);
		expect(r.pivotPosition).toBe(130);
		expect(r.nodeX).toBe(270);
		expect(r.width).toBe(230);
	});

	it("rétrécit la jonction par la gauche quand on tire vers l'intérieur", () => {
		const r = resolveExtremeBranchDrag(baseline, "first", 40, PAGE_WIDTH);

		expect(positionsOf(r.branches, order)).toEqual([10, 150]);
		expect(r.nodeX).toBe(340);
		expect(r.width).toBe(160);
	});

	it("aligne le déplacement sur la grille", () => {
		const r = resolveExtremeBranchDrag(baseline, "first", -23, PAGE_WIDTH);

		expect(r.nodeX).toBe(280);
		expect(r.width).toBe(220);
	});

	it("bute sur le bord de page (x = 0)", () => {
		const r = resolveExtremeBranchDrag(
			{ data: data([10, 190], 100), nodeX: 20, width: 200 },
			"first",
			-100,
			PAGE_WIDTH,
		);

		expect(r.nodeX).toBe(0);
		expect(r.width).toBe(220);
	});

	it("ne rétrécit pas au point de coller la deuxième branche", () => {
		const r = resolveExtremeBranchDrag(baseline, "first", 999, PAGE_WIDTH);

		const [first, second] = positionsOf(r.branches, order);
		expect(second - first).toBeGreaterThanOrEqual(10);
	});

	it("garde le pivot dans le nœud en rétrécissant", () => {
		const r = resolveExtremeBranchDrag(baseline, "first", 999, PAGE_WIDTH);

		expect(r.pivotPosition).toBeGreaterThanOrEqual(10);
	});
});

describe("resolveExtremeBranchDrag — dernière branche", () => {
	const baseline = { data: data([10, 190], 100), nodeX: 300, width: 200 };
	const order = baseline.data.branchesOrder;

	it("élargit la jonction par la droite, bord gauche fixe", () => {
		const r = resolveExtremeBranchDrag(baseline, "last", 40, PAGE_WIDTH);

		expect(positionsOf(r.branches, order)).toEqual([10, 230]);
		expect(r.nodeX).toBe(300);
		expect(r.width).toBe(240);
		expect(r.pivotPosition).toBe(100);
	});

	it("rétrécit la jonction par la droite quand on tire vers l'intérieur", () => {
		const r = resolveExtremeBranchDrag(baseline, "last", -50, PAGE_WIDTH);

		expect(r.width).toBe(150);
		expect(positionsOf(r.branches, order)).toEqual([10, 140]);
	});

	it("bute sur le bord droit de la page", () => {
		const r = resolveExtremeBranchDrag(
			{ data: data([10, 190], 100), nodeX: 600, width: 200 },
			"last",
			999,
			PAGE_WIDTH,
		);

		expect(r.nodeX + r.width).toBeLessThanOrEqual(PAGE_WIDTH);
	});

	it("laisse la dernière branche venir buter pile sur le pivot", () => {
		const r = resolveExtremeBranchDrag(baseline, "last", -999, PAGE_WIDTH);

		expect(positionsOf(r.branches, order)[1]).toBe(baseline.data.pivotPosition);
	});

	it("ne rétrécit pas au point de coller l'avant-dernière branche", () => {
		const three = {
			data: data([10, 100, 190], 100),
			nodeX: 300,
			width: 200,
		};
		const r = resolveExtremeBranchDrag(three, "last", -999, PAGE_WIDTH);

		const positions = positionsOf(r.branches, three.data.branchesOrder);
		expect(positions[2]! - positions[1]!).toBeGreaterThanOrEqual(10);
	});
});
