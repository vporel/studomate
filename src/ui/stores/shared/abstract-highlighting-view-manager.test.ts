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
