import {
	BlockPortSpec,
	getBlockHeightInCells,
	getBlockPinRowCount,
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
