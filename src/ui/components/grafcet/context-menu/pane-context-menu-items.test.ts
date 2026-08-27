import paneContextMenuItems from "./pane-context-menu-items";

function fakeViewManager(nodes: unknown[], edges: unknown[]): any {
	return {
		getNodes: () => nodes,
		getEdges: () => edges,
		selectAllNodesAndEdges: jest.fn(),
		selectAllEdges: jest.fn(),
	};
}

describe("paneContextMenuItems", () => {
	it("désactive 'Tout sélectionner' et 'Exporter' quand le flow est vide", () => {
		const viewManager = fakeViewManager([], []);

		const [[selectAllItem], [exportItem]] = paneContextMenuItems(viewManager);

		expect(selectAllItem.disabled).toBe(true);
		expect(exportItem.disabled).toBe(true);
	});

	it("active 'Tout sélectionner' et 'Exporter' dès qu'il y a au moins un nœud", () => {
		const viewManager = fakeViewManager([{ id: "n1" }], []);

		const [[selectAllItem], [exportItem]] = paneContextMenuItems(viewManager);

		expect(selectAllItem.disabled).toBe(false);
		expect(exportItem.disabled).toBe(false);
	});

	it("désactive 'Sélectionner les liaisons' sans arête, l'active sinon", () => {
		const viewManager = fakeViewManager([{ id: "n1" }], []);
		const [, selectEdgesItem] = paneContextMenuItems(viewManager)[0];

		expect(selectEdgesItem.disabled).toBe(true);

		const viewManagerWithEdges = fakeViewManager(
			[{ id: "n1" }],
			[{ id: "e1" }],
		);
		const [, selectEdgesItemActive] =
			paneContextMenuItems(viewManagerWithEdges)[0];

		expect(selectEdgesItemActive.disabled).toBe(false);
	});

	it("délègue à selectAllNodesAndEdges / selectAllEdges au clic", () => {
		const viewManager = fakeViewManager([{ id: "n1" }], [{ id: "e1" }]);
		const [[selectAllItem, selectEdgesItem]] =
			paneContextMenuItems(viewManager);

		selectAllItem.onClick();
		selectEdgesItem.onClick();

		expect(viewManager.selectAllNodesAndEdges).toHaveBeenCalled();
		expect(viewManager.selectAllEdges).toHaveBeenCalled();
	});
});
