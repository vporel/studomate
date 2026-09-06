import {
	GRAFCET_PAGE_DIMENSIONS,
	getConnectionLinePoints,
	getInitialConnectionPoints,
	grafcetConnectionFromXYFlowConnectionOrEdge,
} from "./grafcet-utils";

/** Nœud interne React Flow minimal : un seul handle source (bas) et un handle target (haut),
 *  tous deux centrés en X, largeur/hauteur de handle nulles pour des centres exacts. */
function fakeInternalNode(
	id: string,
	x: number,
	y: number,
	width: number,
	height: number,
): any {
	return {
		id,
		type: "step",
		measured: { width, height },
		internals: {
			positionAbsolute: { x, y },
			handleBounds: {
				source: [{ id: null, x: width / 2, y: height, width: 0, height: 0 }],
				target: [{ id: null, x: width / 2, y: 0, width: 0, height: 0 }],
			},
		},
	};
}

function fakeRfInstance(nodes: Record<string, any>): any {
	return { getInternalNode: (nodeId: string) => nodes[nodeId] };
}

describe("getConnectionLinePoints", () => {
	it("relie directement quand les extrémités sont alignées verticalement", () => {
		const points = getConnectionLinePoints(50, 0, 51, 100);
		expect(points).toEqual([
			[50, 0],
			[51, 100],
		]);
	});

	it("route en S orthogonal quand la cible est en dessous mais désalignée en X", () => {
		const points = getConnectionLinePoints(0, 0, 100, 100);
		expect(points).toEqual([
			[0, 0],
			[0, 50],
			[100, 50],
			[100, 100],
		]);
	});

	it("contourne par la gauche en 6 points quand la cible est au-dessus (boucle de retour)", () => {
		const points = getConnectionLinePoints(100, 200, 101, 100);
		expect(points).toHaveLength(6);
		expect(points[0]).toEqual([100, 200]);
		expect(points[points.length - 1]).toEqual([101, 100]);
		// Décalage à gauche de 40px, convention du contournement
		expect(points[2][0]).toBe(60);
		expect(points[3][0]).toBe(60);
	});

	it("contourne même quand les extrémités sont désalignées en X (extrémité déplacée)", () => {
		const points = getConnectionLinePoints(100, 200, 300, 100);
		expect(points).toHaveLength(6);
		// Le segment vertical passe à gauche des deux extrémités
		expect(points[2][0]).toBe(60);
		expect(points[3][0]).toBe(60);
	});

	it("ne contourne pas quand la cible n'est pas au-dessus de la source", () => {
		const points = getConnectionLinePoints(100, 100, 101, 200);
		expect(points).toEqual([
			[100, 100],
			[101, 200],
		]);
	});
});

describe("getInitialConnectionPoints", () => {
	// source sous la cible (boucle de retour) : centre source = (110, 400), centre cible = (110, 100)
	const feedbackRf = fakeRfInstance({
		src: fakeInternalNode("src", 100, 360, 20, 40),
		tgt: fakeInternalNode("tgt", 100, 100, 20, 40),
	});
	const connection = {
		source: "src",
		target: "tgt",
		sourceHandle: "",
		targetHandle: "",
	};

	it("fige les 4 coudes intermédiaires du contournement pour une connexion remontante", () => {
		const points = getInitialConnectionPoints(feedbackRf, connection);
		expect(points).toEqual(
			getConnectionLinePoints(110, 400, 110, 100).slice(1, -1),
		);
		expect(points).toHaveLength(4);
	});

	it("retourne [] pour une liaison droite (extrémités alignées, cible en dessous)", () => {
		const rf = fakeRfInstance({
			src: fakeInternalNode("src", 100, 100, 20, 40),
			tgt: fakeInternalNode("tgt", 100, 300, 20, 40),
		});
		expect(getInitialConnectionPoints(rf, connection)).toEqual([]);
	});

	it("retourne [] quand un nœud est introuvable", () => {
		expect(
			getInitialConnectionPoints(fakeRfInstance({}), connection),
		).toEqual([]);
	});
});

describe("grafcetConnectionFromXYFlowConnectionOrEdge", () => {
	const rf = fakeRfInstance({
		src: fakeInternalNode("src", 100, 360, 20, 40),
		tgt: fakeInternalNode("tgt", 100, 100, 20, 40),
	});

	it("dérive data.points pour une nouvelle connexion sans données", () => {
		const conn = grafcetConnectionFromXYFlowConnectionOrEdge(
			rf,
			{ source: "src", target: "tgt", sourceHandle: "", targetHandle: "" },
			"c1",
		);
		expect(conn?.data.points).toHaveLength(4);
	});

	it("conserve les data.points existants d'une arête déjà tracée", () => {
		const existing = { points: [[1, 2]] as [number, number][] };
		const conn = grafcetConnectionFromXYFlowConnectionOrEdge(
			rf,
			{
				id: "c1",
				source: "src",
				target: "tgt",
				sourceHandle: "",
				targetHandle: "",
				data: existing,
			} as any,
			"c1",
		);
		expect(conn?.data.points).toEqual([[1, 2]]);
	});
});

describe("GRAFCET_PAGE_DIMENSIONS", () => {
	it("correspond à une page A4 portrait en pixels (96 dpi)", () => {
		expect(GRAFCET_PAGE_DIMENSIONS).toEqual({ width: 794, height: 1123 });
	});
});
