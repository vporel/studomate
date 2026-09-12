import { JunctionData } from "@/schemas/grafcet/junction.schema";
import {
	resolveBranchPosition,
	resolvePivotPosition,
	snapToGrid,
} from "./branch-position";

const data: JunctionData = {
	pivotPosition: 100,
	branches: {
		b1: { id: "b1", position: 50 },
		b2: { id: "b2", position: 120 },
	},
	branchesOrder: ["b1", "b2"],
};

describe("snapToGrid", () => {
	it("aligne sur la cellule de grille la plus proche", () => {
		expect(snapToGrid(53)).toBe(50);
		expect(snapToGrid(56)).toBe(60);
		expect(snapToGrid(4)).toBe(0);
	});
});

describe("resolvePivotPosition", () => {
	it("retourne la position alignée quand elle est dans les bornes", () => {
		expect(resolvePivotPosition(97, 200)).toBe(100);
	});

	it("retourne null hors des bornes", () => {
		expect(resolvePivotPosition(2, 200)).toBeNull();
		expect(resolvePivotPosition(198, 200)).toBeNull();
	});
});

describe("resolveBranchPosition", () => {
	it("retourne la position alignée quand elle est libre et dans les bornes", () => {
		expect(resolveBranchPosition(data, "b1", 72, 200)).toBe(70);
	});

	it("retourne null si la position chevauche une autre branche", () => {
		expect(resolveBranchPosition(data, "b1", 118, 200)).toBeNull();
	});

	it("autorise la position courante de la branche elle-même", () => {
		expect(resolveBranchPosition(data, "b1", 50, 200)).toBe(50);
	});

	it("retourne null hors des bornes", () => {
		expect(resolveBranchPosition(data, "b1", 4, 200)).toBeNull();
		expect(resolveBranchPosition(data, "b1", 196, 200)).toBeNull();
	});
});
