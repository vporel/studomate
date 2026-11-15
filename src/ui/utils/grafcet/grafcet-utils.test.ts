import {
	GRAFCET_PAGE_DIMENSIONS,
	getConnectionLinePoints,
	getHandleConnectionLinePoints,
	getHorizontalConnectionLinePoints,
	isStraightLinkOffset,
	getInitialConnectionPoints,
	getPageFitZoom,
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

	it("ne contourne pas quand la cible est au-dessus de la source de 10px au plus (éléments collés)", () => {
		expect(getConnectionLinePoints(100, 105, 100, 100)).toEqual([
			[100, 105],
			[100, 100],
		]);
		expect(getConnectionLinePoints(100, 110, 100, 100)).toEqual([
			[100, 110],
			[100, 100],
		]);
	});

	it("route en S quand des éléments collés sont décalés en X", () => {
		expect(getConnectionLinePoints(100, 105, 108, 100)).toEqual([
			[100, 105],
			[100, 102.5],
			[108, 102.5],
			[108, 100],
		]);
	});

	it("contourne dès que la cible est au-dessus de la source de plus de 10px", () => {
		expect(getConnectionLinePoints(100, 111, 100, 100)).toHaveLength(6);
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
		expect(getInitialConnectionPoints(fakeRfInstance({}), connection)).toEqual(
			[],
		);
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

describe("getPageFitZoom", () => {
	const { width: PAGE_WIDTH } = GRAFCET_PAGE_DIMENSIONS;

	it("cale le zoom sur la largeur de la page dans un conteneur étroit", () => {
		expect(getPageFitZoom(PAGE_WIDTH / 1.25, 0.5)).toBeCloseTo(0.8);
	});

	it("ne dépasse pas le zoom 1 dans un conteneur plus large que la page", () => {
		expect(getPageFitZoom(PAGE_WIDTH + 200, 0.5)).toBe(1);
	});

	it("ne descend pas sous le zoom minimal", () => {
		expect(getPageFitZoom(200, 0.5)).toBe(0.5);
	});
});

describe("getHorizontalConnectionLinePoints", () => {
	it("relie directement quand les extrémités sont à la même hauteur", () => {
		expect(getHorizontalConnectionLinePoints(100, 50, 180, 50)).toEqual([
			[100, 50],
			[180, 50],
		]);
		expect(getHorizontalConnectionLinePoints(100, 50, 180, 52)).toEqual([
			[100, 50],
			[180, 52],
		]);
	});

	it.each([
		["cible plus haute", 50, 10],
		["cible plus basse", 50, 90],
	])(
		"route en Z orthogonal, horizontal en sortie et en entrée (%s)",
		(_, fromY, toY) => {
			expect(getHorizontalConnectionLinePoints(100, fromY, 180, toY)).toEqual([
				[100, fromY],
				[140, fromY],
				[140, toY],
				[180, toY],
			]);
		},
	);

	it("ne boucle pas quand la cible est plus haute que la source (le cas d'une étape plus basse que son action)", () => {
		const points = getHorizontalConnectionLinePoints(205, 182, 283, 100);

		expect(Math.min(...points.map(([x]) => x))).toBe(205);
		expect(points[1]).toEqual([244, 182]);
	});

	it("contourne quand la cible est à gauche de la source", () => {
		expect(getHorizontalConnectionLinePoints(200, 100, 100, 140)).toEqual([
			[200, 100],
			[220, 100],
			[220, 120],
			[80, 120],
			[80, 140],
			[100, 140],
		]);
	});

	it("contourne par le haut quand la cible est à gauche et à la même hauteur", () => {
		const points = getHorizontalConnectionLinePoints(200, 100, 100, 100);

		expect(points).toHaveLength(6);
		expect(points[2]).toEqual([220, 60]);
		expect(points[3]).toEqual([80, 60]);
	});
});

describe("getHorizontalConnectionLinePoints: elements side by side", () => {
	it("relie en droite deux éléments collés, sans boucle", () => {
		expect(getHorizontalConnectionLinePoints(280, 120, 280, 120)).toEqual([
			[280, 120],
			[280, 120],
		]);
	});

	it("relie directement une cible qui chevauche la source de 10px au plus", () => {
		expect(getHorizontalConnectionLinePoints(280, 120, 270, 120)).toHaveLength(
			2,
		);
		expect(getHorizontalConnectionLinePoints(280, 120, 270, 160)).toHaveLength(
			4,
		);
	});

	it("contourne une cible située plus de 10px à gauche de la source", () => {
		expect(getHorizontalConnectionLinePoints(280, 120, 269, 120)).toHaveLength(
			6,
		);
	});
});

describe("getHandleConnectionLinePoints", () => {
	it.each(["source:action", "source:next"])(
		"trace horizontalement depuis la poignée d'action d'une étape ou la poignée suivante d'une action (%p)",
		(handle) => {
			expect(getHandleConnectionLinePoints(handle, 100, 50, 180, 90)).toEqual(
				getHorizontalConnectionLinePoints(100, 50, 180, 90),
			);
		},
	);

	it.each(["source:successor", "", null, undefined])(
		"trace verticalement depuis toute autre poignée (%p)",
		(handle) => {
			expect(getHandleConnectionLinePoints(handle, 100, 50, 180, 90)).toEqual(
				getConnectionLinePoints(100, 50, 180, 90),
			);
		},
	);
});

describe("getInitialConnectionPoints: poignée d'action", () => {
	const node = (
		id: string,
		type: string,
		x: number,
		y: number,
		handles: any,
	) => ({
		id,
		type,
		measured: { width: 40, height: 40 },
		internals: { positionAbsolute: { x, y }, handleBounds: handles },
	});

	it("fige un tracé horizontal, sans boucle, quand l'étape est plus basse que l'action", () => {
		const step = node("s", "step", 100, 200, {
			source: [{ id: "source:action", x: 40, y: 20, width: 0, height: 0 }],
		});
		const action = node("a", "action", 300, 100, {
			target: [{ id: "target:predecessor", x: 0, y: 20, width: 0, height: 0 }],
		});

		const points = getInitialConnectionPoints(
			fakeRfInstance({ s: step, a: action }),
			{
				source: "s",
				target: "a",
				sourceHandle: "source:action",
				targetHandle: "target:predecessor",
			},
		);

		// source (140, 220), cible (300, 120): Z via x = 220
		expect(points).toEqual([
			[220, 220],
			[220, 120],
		]);
	});
});

describe("isStraightLinkOffset", () => {
	it("tient pour alignées des extrémités décalées de moins de 3px, dans les deux sens", () => {
		for (const offset of [0, 2, 2.9, -2, -2.9])
			expect(isStraightLinkOffset(offset)).toBe(true);
		for (const offset of [3, -3, 10])
			expect(isStraightLinkOffset(offset)).toBe(false);
	});

	it("décide du tracé droit des liaisons verticales et horizontales au même seuil", () => {
		expect(getConnectionLinePoints(100, 50, 102, 150)).toHaveLength(2);
		expect(getConnectionLinePoints(100, 50, 103, 150)).toHaveLength(4);
		expect(getHorizontalConnectionLinePoints(100, 50, 180, 52)).toHaveLength(2);
		expect(getHorizontalConnectionLinePoints(100, 50, 180, 53)).toHaveLength(4);
	});
});
