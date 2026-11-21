import AbstractHighlightingViewManager, {
	HighlightableStoreState,
} from "./abstract-highlighting-view-manager";

type State = HighlightableStoreState;

class TestViewManager extends AbstractHighlightingViewManager<State> {
	dispose(): void {
		this.disposeHighlights();
	}
}

function makeManager() {
	let state: State = { highlightedNodesIds: [], highlightedEdgesIds: [] };
	const manager = new TestViewManager((updater) => {
		state = { ...state, ...updater(state) };
	});
	return { manager, getState: () => state };
}

describe("AbstractHighlightingViewManager", () => {
	it("highlightNodesAndEdges ajoute les ids au surlignage", () => {
		const { manager, getState } = makeManager();

		manager.highlightNodesAndEdges(["n1", "n2"], ["e1"]);

		expect(getState().highlightedNodesIds).toEqual(["n1", "n2"]);
		expect(getState().highlightedEdgesIds).toEqual(["e1"]);
	});

	it("unhighlightNodesAndEdges ne retire que les ids demandés", () => {
		const { manager, getState } = makeManager();
		manager.highlightNodesAndEdges(["n1", "n2", "n3"], ["e1", "e2"]);

		manager.unhighlightNodesAndEdges(["n2"], ["e1", "e2"]);

		expect(getState().highlightedNodesIds).toEqual(["n1", "n3"]);
		expect(getState().highlightedEdgesIds).toEqual([]);
	});

	it("temporarilyHighlightNodesAndEdges retire le surlignage après la durée", () => {
		jest.useFakeTimers();
		const { manager, getState } = makeManager();

		manager.temporarilyHighlightNodesAndEdges(["n1"], ["e1"], 500);
		expect(getState().highlightedNodesIds).toEqual(["n1"]);

		jest.advanceTimersByTime(500);
		expect(getState().highlightedNodesIds).toEqual([]);
		expect(getState().highlightedEdgesIds).toEqual([]);

		jest.useRealTimers();
	});

	describe("surbrillances qui se chevauchent", () => {
		beforeEach(() => jest.useFakeTimers());
		afterEach(() => jest.useRealTimers());

		it("garde l'élément surligné jusqu'à la fin de la seconde surbrillance", () => {
			const { manager, getState } = makeManager();

			manager.temporarilyHighlightNodesAndEdges(["n1"], [], 1000);
			jest.advanceTimersByTime(600);
			manager.temporarilyHighlightNodesAndEdges(["n1"], [], 1000);

			jest.advanceTimersByTime(400); // fin de la première
			expect(getState().highlightedNodesIds).toEqual(["n1"]);

			jest.advanceTimersByTime(599);
			expect(getState().highlightedNodesIds).toEqual(["n1"]);

			jest.advanceTimersByTime(1); // fin de la seconde
			expect(getState().highlightedNodesIds).toEqual([]);
		});

		it("fait de même pour les arêtes", () => {
			const { manager, getState } = makeManager();

			manager.temporarilyHighlightNodesAndEdges([], ["e1"], 1000);
			jest.advanceTimersByTime(600);
			manager.temporarilyHighlightNodesAndEdges([], ["e1"], 1000);

			jest.advanceTimersByTime(400);
			expect(getState().highlightedEdgesIds).toEqual(["e1"]);
			jest.advanceTimersByTime(600);
			expect(getState().highlightedEdgesIds).toEqual([]);
		});

		it("garde l'élément jusqu'à la fin de la plus longue quand elle a commencé la première", () => {
			const { manager, getState } = makeManager();

			manager.temporarilyHighlightNodesAndEdges(["n1"], [], 3000);
			manager.temporarilyHighlightNodesAndEdges(["n1"], [], 500);

			jest.advanceTimersByTime(500);
			expect(getState().highlightedNodesIds).toEqual(["n1"]);
			jest.advanceTimersByTime(2500);
			expect(getState().highlightedNodesIds).toEqual([]);
		});

		it("laisse indépendants les éléments différents", () => {
			const { manager, getState } = makeManager();

			manager.temporarilyHighlightNodesAndEdges(["n1"], [], 500);
			manager.temporarilyHighlightNodesAndEdges(["n2"], [], 1000);

			jest.advanceTimersByTime(500);
			expect(getState().highlightedNodesIds).toEqual(["n2"]);
			jest.advanceTimersByTime(500);
			expect(getState().highlightedNodesIds).toEqual([]);
		});

		it("éteint l'élément à l'expiration quand les surbrillances se suivent sans se chevaucher", () => {
			const { manager, getState } = makeManager();

			manager.temporarilyHighlightNodesAndEdges(["n1"], [], 500);
			jest.advanceTimersByTime(500);
			expect(getState().highlightedNodesIds).toEqual([]);
			manager.temporarilyHighlightNodesAndEdges(["n1"], [], 500);
			expect(getState().highlightedNodesIds).toEqual(["n1"]);
			jest.advanceTimersByTime(500);

			expect(getState().highlightedNodesIds).toEqual([]);
		});
	});

	it("retire un id passé deux fois dans un appel par un appel symétrique", () => {
		const { manager, getState } = makeManager();
		manager.highlightNodesAndEdges(["n1", "n1"], []);

		manager.unhighlightNodesAndEdges(["n1", "n1"], []);

		expect(getState().highlightedNodesIds).toEqual([]);
	});

	it("n'enlève qu'une occurrence d'un id surligné deux fois", () => {
		const { manager, getState } = makeManager();
		manager.highlightNodesAndEdges(["n1"], []);
		manager.highlightNodesAndEdges(["n1"], []);

		manager.unhighlightNodesAndEdges(["n1"], []);

		expect(getState().highlightedNodesIds).toEqual(["n1"]);
	});

	it("ignore le retrait d'un id qui n'est pas surligné", () => {
		const { manager, getState } = makeManager();
		manager.highlightNodesAndEdges(["n1"], ["e1"]);

		manager.unhighlightNodesAndEdges(["absent"], ["inconnue"]);

		expect(getState().highlightedNodesIds).toEqual(["n1"]);
		expect(getState().highlightedEdgesIds).toEqual(["e1"]);
	});

	it("dispose annule les minuteries de surlignage encore en attente", () => {
		jest.useFakeTimers();
		const { manager, getState } = makeManager();

		manager.temporarilyHighlightNodesAndEdges(["n1"], [], 500);
		manager.dispose();
		jest.advanceTimersByTime(500);

		expect(getState().highlightedNodesIds).toEqual(["n1"]); // pas dé-surligné

		jest.useRealTimers();
	});
});
