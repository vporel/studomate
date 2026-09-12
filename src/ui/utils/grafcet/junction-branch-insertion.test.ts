import { JunctionData } from "@/schemas/grafcet/junction.schema";
import computeBranchInsertion from "./junction-branch-insertion";

function data(
	positions: number[],
	pivotPosition = 100,
): JunctionData {
	const branches: JunctionData["branches"] = {};
	const branchesOrder: string[] = [];
	positions.forEach((p, i) => {
		const id = "b" + (i + 1);
		branches[id] = { id, position: p };
		branchesOrder.push(id);
	});
	return { pivotPosition, branches, branchesOrder };
}

const PAGE = 1000;

describe("computeBranchInsertion — milieu", () => {
	it("insère à mi-distance des voisines, arrondi grille", () => {
		const res = computeBranchInsertion(data([10, 190]), 200, 300, PAGE, 1, "n")!;
		expect(res.width).toBe(200);
		expect(res.nodeX).toBe(300);
		expect(res.branchesOrder).toEqual(["b1", "n", "b2"]);
		expect(res.branches["n"].position).toBe(100);
	});

	it("renvoie null si l'écart entre voisines vaut une cellule", () => {
		expect(
			computeBranchInsertion(data([10, 20, 190]), 200, 0, PAGE, 1, "n"),
		).toBeNull();
	});
});

describe("computeBranchInsertion — droite", () => {
	it("reproduit l'écart extérieur et élargit la jonction", () => {
		const res = computeBranchInsertion(data([10, 190]), 200, 0, PAGE, 2, "n")!;
		expect(res.branches["n"].position).toBe(370);
		expect(res.width).toBe(380);
		expect(res.nodeX).toBe(0);
		expect(res.pivotPosition).toBe(100);
		expect(res.branchesOrder).toEqual(["b1", "b2", "n"]);
	});

	it("utilise l'intervalle des deux dernières branches quand il y en a plus de deux", () => {
		const res = computeBranchInsertion(
			data([10, 100, 190]),
			200,
			0,
			PAGE,
			3,
			"n",
		)!;
		expect(res.branches["n"].position).toBe(280); // écart 90
		expect(res.width).toBe(290);
	});

	it("bride la nouvelle branche au bord de page", () => {
		// jonction en x=700 : l'écart idéal (180) sortirait de la page.
		const res = computeBranchInsertion(data([10, 190]), 200, 700, PAGE, 2, "n")!;
		expect(res.branches["n"].position).toBe(290); // 1000 - 700 - 10
		expect(res.width).toBe(300);
		expect(res.nodeX).toBe(700);
	});

	it("renvoie null si même bridée la branche ne dépasse pas la dernière", () => {
		expect(
			computeBranchInsertion(data([10, 190]), 200, 990, PAGE, 2, "n"),
		).toBeNull();
	});
});

describe("computeBranchInsertion — gauche", () => {
	it("décale la jonction vers la gauche en gardant l'écart extérieur", () => {
		const res = computeBranchInsertion(data([10, 190]), 200, 300, PAGE, 0, "n")!;
		expect(res.nodeX).toBe(120); // 300 - 180
		expect(res.width).toBe(380);
		expect(res.pivotPosition).toBe(280); // 100 + 180
		expect(res.branches["b1"].position).toBe(190);
		expect(res.branches["b2"].position).toBe(370);
		expect(res.branches["n"].position).toBe(10);
		expect(res.branchesOrder).toEqual(["n", "b1", "b2"]);
	});

	it("bride le décalage à x=0", () => {
		const res = computeBranchInsertion(data([10, 190]), 200, 50, PAGE, 0, "n")!;
		expect(res.nodeX).toBe(0);
		expect(res.width).toBe(250); // 200 + 50
		expect(res.branches["b1"].position).toBe(60); // 10 + 50
		expect(res.branches["n"].position).toBe(10);
	});

	it("renvoie null si la jonction est déjà collée à gauche", () => {
		expect(
			computeBranchInsertion(data([10, 190]), 200, 0, PAGE, 0, "n"),
		).toBeNull();
	});

	it("utilise l'intervalle des deux premières branches quand il y en a plus de deux", () => {
		const res = computeBranchInsertion(
			data([10, 100, 190]),
			200,
			300,
			PAGE,
			0,
			"n",
		)!;
		expect(res.nodeX).toBe(210); // 300 - 90
		expect(res.branches["n"].position).toBe(10);
		expect(res.branches["b1"].position).toBe(100);
	});
});
