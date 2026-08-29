import paneContextMenuItems from "./pane-context-menu-items";

function fakeViewManager(nodes: unknown[], edges: unknown[]): any {
	return {
		getNodes: () => nodes,
		getEdges: () => edges,
		selectAllNodesAndEdges: jest.fn(),
		selectAllEdges: jest.fn(),
	};
}

const fakeCopyCutPasteManager = () => ({ pasteElements: jest.fn() }) as any;
const SCREEN_POSITION = { x: 12, y: 34 };

function items(viewManager: any, canPaste = false, ccp = fakeCopyCutPasteManager()) {
	return paneContextMenuItems(viewManager, ccp, SCREEN_POSITION, canPaste);
}

describe("paneContextMenuItems", () => {
	it("désactive 'Tout sélectionner' et 'Exporter' quand le flow est vide", () => {
		const [[selectAllItem], , [exportItem]] = items(fakeViewManager([], []));

		expect(selectAllItem.disabled).toBe(true);
		expect(exportItem.disabled).toBe(true);
	});

	it("active 'Tout sélectionner' et 'Exporter' dès qu'il y a au moins un nœud", () => {
		const [[selectAllItem], , [exportItem]] = items(
			fakeViewManager([{ id: "n1" }], []),
		);

		expect(selectAllItem.disabled).toBe(false);
		expect(exportItem.disabled).toBe(false);
	});

	it("désactive 'Sélectionner les liaisons' sans arête, l'active sinon", () => {
		const [, selectEdgesItem] = items(fakeViewManager([{ id: "n1" }], []))[0];
		expect(selectEdgesItem.disabled).toBe(true);

		const [, selectEdgesItemActive] = items(
			fakeViewManager([{ id: "n1" }], [{ id: "e1" }]),
		)[0];
		expect(selectEdgesItemActive.disabled).toBe(false);
	});

	it("délègue à selectAllNodesAndEdges / selectAllEdges au clic", () => {
		const viewManager = fakeViewManager([{ id: "n1" }], [{ id: "e1" }]);
		const [[selectAllItem, selectEdgesItem]] = items(viewManager);

		selectAllItem.onClick();
		selectEdgesItem.onClick();

		expect(viewManager.selectAllNodesAndEdges).toHaveBeenCalled();
		expect(viewManager.selectAllEdges).toHaveBeenCalled();
	});

	it("grise 'Coller' quand le presse-papiers n'est pas collable, l'active sinon", () => {
		const [, [pasteDisabled]] = items(fakeViewManager([], []), false);
		expect(pasteDisabled.disabled).toBe(true);

		const [, [pasteEnabled]] = items(fakeViewManager([], []), true);
		expect(pasteEnabled.disabled).toBe(false);
	});

	it("colle à la position écran du clic droit", () => {
		const ccp = fakeCopyCutPasteManager();
		const [, [pasteItem]] = items(fakeViewManager([], []), true, ccp);

		pasteItem.onClick();

		expect(ccp.pasteElements).toHaveBeenCalledWith(SCREEN_POSITION);
	});
});
