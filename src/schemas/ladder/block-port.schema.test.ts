import {
	BlockPortSpec,
	getBlockHeightInCells,
	getBlockHeightInCellUnits,
	getBlockPinRowCount,
	getParameterPinRows,
	requireConcreteType,
} from "./block-port.schema";

const structuralPort = (
	suffix: string,
	direction: "input" | "output",
): BlockPortSpec => ({
	suffix,
	type: "BOOL",
	kind: "structural",
	direction,
	generatesVariable: true,
});

const parameterPort = (
	suffix: string,
	direction: "input" | "output",
): BlockPortSpec => ({
	suffix,
	type: "TIME",
	kind: "parameter",
	direction,
	generatesVariable: direction === "output",
});

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

describe("getBlockHeightInCells", () => {
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

	it("une seule ligne de pins : 1 cellule", () => {
		expect(getBlockHeightInCells(structuralOnly)).toBe(1);
	});

	it("deux lignes de pins (timer) : 2 cellules", () => {
		expect(getBlockHeightInCells(timerLike)).toBe(2);
	});

	it("trois lignes de pins : 2 cellules", () => {
		expect(getBlockHeightInCells(threeRows)).toBe(2);
	});
});

describe("getBlockHeightInCellUnits", () => {
	it("une seule ligne de pins : 1 cellule pleine", () => {
		expect(
			getBlockHeightInCellUnits([
				structuralPort("EN", "input"),
				structuralPort("ENO", "output"),
			]),
		).toBe(1);
	});

	it("deux lignes de pins (timer) : 1.5 cellule précisément", () => {
		expect(
			getBlockHeightInCellUnits([
				structuralPort("IN", "input"),
				structuralPort("Q", "output"),
				parameterPort("PT", "input"),
				parameterPort("ET", "output"),
			]),
		).toBe(1.5);
	});

	it("trois lignes de pins : 2 cellules précisément", () => {
		expect(
			getBlockHeightInCellUnits([
				structuralPort("IN", "input"),
				structuralPort("Q", "output"),
				parameterPort("P1", "input"),
				parameterPort("P2", "input"),
			]),
		).toBe(2);
	});
});

describe("getParameterPinRows", () => {
	it("associe l'entrée et la sortie paramètres de même rang sur une seule ligne", () => {
		const pt = parameterPort("PT", "input");
		const et = parameterPort("ET", "output");
		expect(
			getParameterPinRows([
				structuralPort("IN", "input"),
				structuralPort("Q", "output"),
				pt,
				et,
			]),
		).toEqual([{ input: pt, output: et }]);
	});

	it("laisse un côté vide quand les comptes d'entrées/sorties paramètres diffèrent", () => {
		const p1 = parameterPort("P1", "input");
		const p2 = parameterPort("P2", "input");
		expect(getParameterPinRows([p1, p2])).toEqual([
			{ input: p1, output: undefined },
			{ input: p2, output: undefined },
		]);
	});

	it("renvoie un tableau vide sans port paramètre", () => {
		expect(getParameterPinRows([structuralPort("EN", "input")])).toEqual([]);
	});
});
