import paneContextMenuItems from "./pane-context-menu-items";

function fakeWorkflowManager(nodes: unknown[], edges: unknown[]): any {
	return {
		getNodes: () => nodes,
		getEdges: () => edges,
		selectAllNodesAndEdges: jest.fn(),
		selectAllEdges: jest.fn(),
	};
}

describe("paneContextMenuItems (Ladder)", () => {
	it("désactive 'Tout sélectionner' quand la section est vide", () => {
		const workflowManager = fakeWorkflowManager([], []);

		const [[selectAllItem]] = paneContextMenuItems(workflowManager, "s1");

		expect(selectAllItem.disabled).toBe(true);
	});

	it("active 'Tout sélectionner' dès qu'il y a au moins un nœud", () => {
		const workflowManager = fakeWorkflowManager([{ id: "n1" }], []);

		const [[selectAllItem]] = paneContextMenuItems(workflowManager, "s1");

		expect(selectAllItem.disabled).toBe(false);
	});

	it("désactive 'Sélectionner les liaisons' sans arête, l'active sinon", () => {
		const [, withoutEdges] = paneContextMenuItems(fakeWorkflowManager([{ id: "n1" }], []), "s1")[0];
		expect(withoutEdges.disabled).toBe(true);

		const [, withEdges] = paneContextMenuItems(fakeWorkflowManager([{ id: "n1" }], [{ id: "e1" }]), "s1")[0];
		expect(withEdges.disabled).toBe(false);
	});

	it("délègue à selectAllNodesAndEdges / selectAllEdges pour la bonne section, au clic", () => {
		const workflowManager = fakeWorkflowManager([{ id: "n1" }], [{ id: "e1" }]);
		const [[selectAllItem, selectEdgesItem]] = paneContextMenuItems(workflowManager, "s1");

		selectAllItem.onClick();
		selectEdgesItem.onClick();

		expect(workflowManager.selectAllNodesAndEdges).toHaveBeenCalledWith("s1");
		expect(workflowManager.selectAllEdges).toHaveBeenCalledWith("s1");
	});
});
