import { BlockPortSpec } from "@/schemas/ladder/block-port.schema";
import {
	getBlockHeightInCellUnits,
	getParameterPinRows,
} from "./block-node-layout";

const structural = (
	suffix: string,
	direction: "input" | "output",
): BlockPortSpec => ({
	suffix,
	type: "BOOL",
	kind: "structural",
	direction,
	generatesVariable: true,
});

const parameter = (
	suffix: string,
	direction: "input" | "output",
): BlockPortSpec => ({
	suffix,
	type: "TIME",
	kind: "parameter",
	direction,
	generatesVariable: direction === "output",
});

describe("getBlockHeightInCellUnits", () => {
	it("une seule ligne de pins : 1 cellule pleine", () => {
		expect(
			getBlockHeightInCellUnits([
				structural("EN", "input"),
				structural("ENO", "output"),
			]),
		).toBe(1);
	});

	it("deux lignes de pins (timer) : 1.5 cellule précisément", () => {
		expect(
			getBlockHeightInCellUnits([
				structural("IN", "input"),
				structural("Q", "output"),
				parameter("PT", "input"),
				parameter("ET", "output"),
			]),
		).toBe(1.5);
	});

	it("trois lignes de pins : 2 cellules précisément", () => {
		expect(
			getBlockHeightInCellUnits([
				structural("IN", "input"),
				structural("Q", "output"),
				parameter("P1", "input"),
				parameter("P2", "input"),
			]),
		).toBe(2);
	});
});

describe("getParameterPinRows", () => {
	it("associe l'entrée et la sortie paramètres de même rang sur une seule ligne", () => {
		const pt = parameter("PT", "input");
		const et = parameter("ET", "output");
		expect(
			getParameterPinRows([
				structural("IN", "input"),
				structural("Q", "output"),
				pt,
				et,
			]),
		).toEqual([{ input: pt, output: et }]);
	});

	it("laisse un côté vide quand les comptes d'entrées/sorties paramètres diffèrent", () => {
		const p1 = parameter("P1", "input");
		const p2 = parameter("P2", "input");
		expect(getParameterPinRows([p1, p2])).toEqual([
			{ input: p1, output: undefined },
			{ input: p2, output: undefined },
		]);
	});

	it("renvoie un tableau vide sans port paramètre", () => {
		expect(getParameterPinRows([structural("EN", "input")])).toEqual([]);
	});
});
