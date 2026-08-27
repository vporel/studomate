import {
	BlockPortSpec,
	getBlockHeightInCellUnits,
	getBlockHeightInCells,
	getBlockPinRowCount,
	getParameterPinRows,
	requireConcreteType,
} from "./block-port.schema";

describe("requireConcreteType", () => {
	it("renvoie le type d'un port concret", () => {
		expect(
			requireConcreteType({
				suffix: "PT",
				type: "TIME",
				kind: "parameter",
				direction: "input",
				generatesVariable: false,
			}),
		).toBe("TIME");
	});

	it("lève pour un port de type ANY", () => {
		expect(() =>
			requireConcreteType({
				suffix: "IN1",
				type: "ANY",
				kind: "parameter",
				direction: "input",
				generatesVariable: false,
			}),
		).toThrow();
	});
});

describe("getBlockPinRowCount", () => {
	it("vaut 1 pour des ports uniquement structurels (pas de rangée de paramètres)", () => {
		const portSpecs: BlockPortSpec[] = [
			{
				suffix: "EN",
				type: "BOOL",
				kind: "structural",
				direction: "input",
				generatesVariable: true,
			},
			{
				suffix: "ENO",
				type: "BOOL",
				kind: "structural",
				direction: "output",
				generatesVariable: true,
			},
		];

		expect(getBlockPinRowCount(portSpecs)).toBe(1);
	});

	it("ajoute une ligne quand une entrée et une sortie paramètres se partagent une même rangée", () => {
		const portSpecs: BlockPortSpec[] = [
			{
				suffix: "IN",
				type: "BOOL",
				kind: "structural",
				direction: "input",
				generatesVariable: true,
			},
			{
				suffix: "Q",
				type: "BOOL",
				kind: "structural",
				direction: "output",
				generatesVariable: true,
			},
			{
				suffix: "PT",
				type: "TIME",
				kind: "parameter",
				direction: "input",
				generatesVariable: false,
			},
			{
				suffix: "ET",
				type: "TIME",
				kind: "parameter",
				direction: "output",
				generatesVariable: true,
			},
		];

		expect(getBlockPinRowCount(portSpecs)).toBe(2);
	});

	it("prend le maximum quand les entrées et sorties paramètres sont en nombre différent", () => {
		const portSpecs: BlockPortSpec[] = [
			{
				suffix: "IN",
				type: "BOOL",
				kind: "structural",
				direction: "input",
				generatesVariable: true,
			},
			{
				suffix: "Q",
				type: "BOOL",
				kind: "structural",
				direction: "output",
				generatesVariable: true,
			},
			{
				suffix: "P1",
				type: "TIME",
				kind: "parameter",
				direction: "input",
				generatesVariable: false,
			},
			{
				suffix: "P2",
				type: "TIME",
				kind: "parameter",
				direction: "input",
				generatesVariable: false,
			},
			{
				suffix: "P3",
				type: "TIME",
				kind: "parameter",
				direction: "output",
				generatesVariable: true,
			},
		];

		expect(getBlockPinRowCount(portSpecs)).toBe(3);
	});
});

describe("getBlockHeightInCellUnits / getBlockHeightInCells", () => {
	const structuralOnly: BlockPortSpec[] = [
		{
			suffix: "EN",
			type: "BOOL",
			kind: "structural",
			direction: "input",
			generatesVariable: true,
		},
		{
			suffix: "ENO",
			type: "BOOL",
			kind: "structural",
			direction: "output",
			generatesVariable: true,
		},
	];
	const timerLike: BlockPortSpec[] = [
		{
			suffix: "IN",
			type: "BOOL",
			kind: "structural",
			direction: "input",
			generatesVariable: true,
		},
		{
			suffix: "Q",
			type: "BOOL",
			kind: "structural",
			direction: "output",
			generatesVariable: true,
		},
		{
			suffix: "PT",
			type: "TIME",
			kind: "parameter",
			direction: "input",
			generatesVariable: false,
		},
		{
			suffix: "ET",
			type: "TIME",
			kind: "parameter",
			direction: "output",
			generatesVariable: true,
		},
	];
	const threeRows: BlockPortSpec[] = [
		{
			suffix: "IN",
			type: "BOOL",
			kind: "structural",
			direction: "input",
			generatesVariable: true,
		},
		{
			suffix: "Q",
			type: "BOOL",
			kind: "structural",
			direction: "output",
			generatesVariable: true,
		},
		{
			suffix: "P1",
			type: "TIME",
			kind: "parameter",
			direction: "input",
			generatesVariable: false,
		},
		{
			suffix: "P2",
			type: "TIME",
			kind: "parameter",
			direction: "input",
			generatesVariable: false,
		},
	];

	it("une seule ligne de pins : 1 cellule pleine, pas d'arrondi nécessaire", () => {
		expect(getBlockHeightInCellUnits(structuralOnly)).toBe(1);
		expect(getBlockHeightInCells(structuralOnly)).toBe(1);
	});

	it("deux lignes de pins (timer) : 1.5 cellule précisément, arrondi à 2 pour la grille", () => {
		expect(getBlockHeightInCellUnits(timerLike)).toBe(1.5);
		expect(getBlockHeightInCells(timerLike)).toBe(2);
	});

	it("trois lignes de pins : 2 cellules précisément, pas d'arrondi supplémentaire", () => {
		expect(getBlockHeightInCellUnits(threeRows)).toBe(2);
		expect(getBlockHeightInCells(threeRows)).toBe(2);
	});
});

describe("getParameterPinRows", () => {
	it("associe l'entrée et la sortie paramètres de même rang sur une seule ligne", () => {
		const pt: BlockPortSpec = {
			suffix: "PT",
			type: "TIME",
			kind: "parameter",
			direction: "input",
			generatesVariable: false,
		};
		const et: BlockPortSpec = {
			suffix: "ET",
			type: "TIME",
			kind: "parameter",
			direction: "output",
			generatesVariable: true,
		};
		const portSpecs: BlockPortSpec[] = [
			{
				suffix: "IN",
				type: "BOOL",
				kind: "structural",
				direction: "input",
				generatesVariable: true,
			},
			{
				suffix: "Q",
				type: "BOOL",
				kind: "structural",
				direction: "output",
				generatesVariable: true,
			},
			pt,
			et,
		];

		expect(getParameterPinRows(portSpecs)).toEqual([{ input: pt, output: et }]);
	});

	it("laisse un côté vide quand les comptes d'entrées/sorties paramètres diffèrent", () => {
		const p1: BlockPortSpec = {
			suffix: "P1",
			type: "TIME",
			kind: "parameter",
			direction: "input",
			generatesVariable: false,
		};
		const p2: BlockPortSpec = {
			suffix: "P2",
			type: "TIME",
			kind: "parameter",
			direction: "input",
			generatesVariable: false,
		};
		const portSpecs: BlockPortSpec[] = [p1, p2];

		expect(getParameterPinRows(portSpecs)).toEqual([
			{ input: p1, output: undefined },
			{ input: p2, output: undefined },
		]);
	});

	it("renvoie un tableau vide sans port paramètre", () => {
		const portSpecs: BlockPortSpec[] = [
			{
				suffix: "EN",
				type: "BOOL",
				kind: "structural",
				direction: "input",
				generatesVariable: true,
			},
		];

		expect(getParameterPinRows(portSpecs)).toEqual([]);
	});
});
