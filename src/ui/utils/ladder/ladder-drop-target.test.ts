import { resolveDropTarget } from "./ladder-drop-target";

describe("resolveDropTarget", () => {
	it("place l'élément exactement à la cellule visée", () => {
		expect(resolveDropTarget([], 2, 3)).toEqual({ row: 2, col: 3, sourceId: null });
	});

	it("connecte automatiquement depuis l'élément le plus proche à gauche sur la même ligne", () => {
		const leaves = [
			{ id: "a", row: 0, col: 0 },
			{ id: "b", row: 0, col: 2 },
		];

		expect(resolveDropTarget(leaves, 0, 5)).toEqual({ row: 0, col: 5, sourceId: "b" });
	});

	it("ignore les éléments d'une autre ligne", () => {
		const leaves = [
			{ id: "a", row: 1, col: 0 },
			{ id: "b", row: 0, col: 5 },
		];

		expect(resolveDropTarget(leaves, 0, 3)).toEqual({ row: 0, col: 3, sourceId: null });
	});

	it("aucune connexion automatique dans une section vide", () => {
		expect(resolveDropTarget([], 0, 0)).toEqual({ row: 0, col: 0, sourceId: null });
	});
});
