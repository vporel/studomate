/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { JunctionData } from "@/schemas/grafcet/junction.schema";

jest.mock("../JunctionNodeBranchAddButtons", () => ({
	JUNCTION_NODE_BRANCH_ADD_BUTTON_WIDTH: 20,
}));

import useBranchAddButtonsPositions from "./useBranchAddButtonsPositions";

function makeNodeData(overrides: Partial<JunctionData>): JunctionData {
	return {
		pivotPosition: 100,
		branches: {},
		branchesOrder: [],
		...overrides,
	} as JunctionData;
}

function run(nodeData: JunctionData, width = 200) {
	return renderHook(() => useBranchAddButtonsPositions(nodeData, width)).result;
}

describe("useBranchAddButtonsPositions", () => {
	it("retourne un seul bouton centré quand il n'y a aucune branche", () => {
		expect(run(makeNodeData({})).current).toEqual([
			{ left: 100, insertIndex: 0 },
		]);
	});

	it("retourne un bouton avant, entre et après les branches existantes", () => {
		const nodeData = makeNodeData({
			branches: {
				a: { id: "a", position: 60 },
				b: { id: "b", position: 140 },
			},
			branchesOrder: ["a", "b"],
		});
		expect(run(nodeData).current).toEqual([
			{ left: 30, insertIndex: 0 },
			{ left: 100, insertIndex: 1 },
			{ left: 170, insertIndex: 2 },
		]);
	});

	it("masque le bouton intermédiaire quand l'écart entre deux branches est ≤ 20", () => {
		const nodeData = makeNodeData({
			branches: {
				a: { id: "a", position: 50 },
				b: { id: "b", position: 70 }, // écart 20 -> masqué
				c: { id: "c", position: 100 }, // écart 30 -> affiché
				d: { id: "d", position: 180 },
			},
			branchesOrder: ["a", "b", "c", "d"],
		});
		expect(run(nodeData).current.map((b) => b.insertIndex)).toEqual([
			0, 2, 3, 4,
		]);
	});

	it("décale le bouton de tête hors du nœud quand la première branche est près du bord", () => {
		const nodeData = makeNodeData({
			branches: { a: { id: "a", position: 10 } },
			branchesOrder: ["a"],
		});
		expect(run(nodeData).current[0].left).toBe(-10);
	});

	it("décale le bouton de fin hors du nœud quand la dernière branche est près du bord", () => {
		const nodeData = makeNodeData({
			branches: { a: { id: "a", position: 195 } },
			branchesOrder: ["a"],
		});
		expect(run(nodeData).current[1].left).toBe(210);
	});
});
