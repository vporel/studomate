import LadderSelectionManager, {
	withSelectionClearedOutside,
} from "./selection.manager";

type FakeState = {
	nodesBySectionId: Record<string, any[]>;
	edgesBySectionId: Record<string, any[]>;
	activeSectionId: string | null;
};

function setup(initial: Partial<FakeState>) {
	let state: FakeState = {
		nodesBySectionId: {},
		edgesBySectionId: {},
		activeSectionId: null,
		...initial,
	};
	const setStoreState = jest.fn((partial: any) => {
		state = {
			...state,
			...(typeof partial === "function" ? partial(state) : partial),
		};
	});
	const getStoreState = jest.fn(() => state as any);
	const manager = new LadderSelectionManager(
		setStoreState as any,
		getStoreState as any,
	);
	return { manager, getState: () => state };
}

describe("withSelectionClearedOutside", () => {
	it("renvoie les maps par référence quand inactif (aucun re-render)", () => {
		const maps = {
			nodesBySectionId: { s1: [{ id: "n1", selected: true }] },
			edgesBySectionId: { s1: [{ id: "e1", selected: true }] },
		};

		const result = withSelectionClearedOutside(maps as any, "s2", false);

		expect(result.nodesBySectionId).toBe(maps.nodesBySectionId);
		expect(result.edgesBySectionId).toBe(maps.edgesBySectionId);
	});

	it("retire la sélection partout sauf dans keepSectionId quand actif", () => {
		const maps = {
			nodesBySectionId: {
				s1: [{ id: "n1", selected: true }],
				s2: [{ id: "n2", selected: true }],
			},
			edgesBySectionId: {
				s1: [{ id: "e1", selected: true }],
				s2: [{ id: "e2", selected: true }],
			},
		};

		const result = withSelectionClearedOutside(maps as any, "s2", true);

		expect(result.nodesBySectionId.s1[0].selected).toBe(false);
		expect(result.edgesBySectionId.s1[0].selected).toBe(false);
		expect(result.nodesBySectionId.s2[0].selected).toBe(true);
		expect(result.edgesBySectionId.s2[0].selected).toBe(true);
	});

	it("laisse intacte par référence une section déjà sans sélection", () => {
		const untouched = [{ id: "n1", selected: false }];
		const maps = {
			nodesBySectionId: { s1: untouched, s2: [{ id: "n2", selected: true }] },
			edgesBySectionId: { s1: [], s2: [] },
		};

		const result = withSelectionClearedOutside(maps as any, "s2", true);

		expect(result.nodesBySectionId.s1).toBe(untouched);
	});
});

describe("LadderSelectionManager", () => {
	it("getNodes / getEdges renvoient les tableaux de la section (ou vide)", () => {
		const { manager } = setup({
			nodesBySectionId: { s1: [{ id: "n1" }] },
			edgesBySectionId: { s1: [{ id: "e1" }] },
		});

		expect(manager.getNodes("s1")).toHaveLength(1);
		expect(manager.getEdges("s1")).toHaveLength(1);
		expect(manager.getNodes("inconnue")).toEqual([]);
		expect(manager.getEdges("inconnue")).toEqual([]);
	});

	it("selectAllNodesAndEdges sélectionne tous les nœuds et arêtes de la section", () => {
		const { manager, getState } = setup({
			nodesBySectionId: { s1: [{ id: "n1" }, { id: "n2" }] },
			edgesBySectionId: { s1: [{ id: "e1" }] },
		});

		manager.selectAllNodesAndEdges("s1");

		expect(getState().nodesBySectionId.s1.every((n: any) => n.selected)).toBe(
			true,
		);
		expect(getState().edgesBySectionId.s1.every((e: any) => e.selected)).toBe(
			true,
		);
	});

	it("selectAllEdges ne touche qu'aux arêtes", () => {
		const { manager, getState } = setup({
			nodesBySectionId: { s1: [{ id: "n1", selected: false }] },
			edgesBySectionId: { s1: [{ id: "e1" }] },
		});

		manager.selectAllEdges("s1");

		expect(getState().edgesBySectionId.s1[0].selected).toBe(true);
		expect(getState().nodesBySectionId.s1[0].selected).toBe(false);
	});

	it("deselectAllElements retire la sélection dans toutes les sections", () => {
		const { manager, getState } = setup({
			nodesBySectionId: {
				s1: [{ id: "n1", selected: true }],
				s2: [{ id: "n2", selected: true }],
			},
			edgesBySectionId: { s1: [{ id: "e1", selected: true }], s2: [] },
		});

		manager.deselectAllElements();

		expect(getState().nodesBySectionId.s1[0].selected).toBe(false);
		expect(getState().nodesBySectionId.s2[0].selected).toBe(false);
		expect(getState().edgesBySectionId.s1[0].selected).toBe(false);
	});

	describe("selectAllInActiveSection", () => {
		it("sélectionne tout dans la section active", () => {
			const { manager, getState } = setup({
				nodesBySectionId: { s1: [{ id: "n1" }], s2: [{ id: "n2" }] },
				edgesBySectionId: { s1: [], s2: [] },
				activeSectionId: "s2",
			});

			manager.selectAllInActiveSection();

			expect(getState().nodesBySectionId.s2[0].selected).toBe(true);
			expect(getState().nodesBySectionId.s1[0].selected).toBeUndefined();
		});

		it("ne fait rien s'il n'y a pas de section active", () => {
			const { manager, getState } = setup({
				nodesBySectionId: { s1: [{ id: "n1" }] },
				edgesBySectionId: { s1: [] },
				activeSectionId: null,
			});

			manager.selectAllInActiveSection();

			expect(getState().nodesBySectionId.s1[0].selected).toBeUndefined();
		});
	});
});
