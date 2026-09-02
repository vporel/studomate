import { identityT } from "@tests/utils/i18n";
import paneContextMenuItems from "./pane-context-menu-items";

function fakeWorkflowManager(nodes: unknown[], edges: unknown[]): any {
	return {
		getNodes: () => nodes,
		getEdges: () => edges,
		selectAllNodesAndEdges: jest.fn(),
		selectAllEdges: jest.fn(),
	};
}

const fakeCopyCutPasteManager = () => ({ pasteElements: jest.fn() }) as any;
const SCREEN_POSITION = { x: 12, y: 34 };

function items(
	workflowManager: any,
	canPaste = false,
	ccp = fakeCopyCutPasteManager(),
) {
	return paneContextMenuItems(
		workflowManager,
		"s1",
		ccp,
		SCREEN_POSITION,
		canPaste,
		identityT,
	);
}

describe("paneContextMenuItems (Ladder)", () => {
	it("désactive 'Tout sélectionner' quand la section est vide", () => {
		const [[selectAllItem]] = items(fakeWorkflowManager([], []));

		expect(selectAllItem.disabled).toBe(true);
	});

	it("active 'Tout sélectionner' dès qu'il y a au moins un nœud", () => {
		const [[selectAllItem]] = items(fakeWorkflowManager([{ id: "n1" }], []));

		expect(selectAllItem.disabled).toBe(false);
	});

	it("désactive 'Sélectionner les liaisons' sans arête, l'active sinon", () => {
		const [, withoutEdges] = items(fakeWorkflowManager([{ id: "n1" }], []))[0];
		expect(withoutEdges.disabled).toBe(true);

		const [, withEdges] = items(
			fakeWorkflowManager([{ id: "n1" }], [{ id: "e1" }]),
		)[0];
		expect(withEdges.disabled).toBe(false);
	});

	it("délègue à selectAllNodesAndEdges / selectAllEdges pour la bonne section, au clic", () => {
		const workflowManager = fakeWorkflowManager([{ id: "n1" }], [{ id: "e1" }]);
		const [[selectAllItem, selectEdgesItem]] = items(workflowManager);

		selectAllItem.onClick();
		selectEdgesItem.onClick();

		expect(workflowManager.selectAllNodesAndEdges).toHaveBeenCalledWith("s1");
		expect(workflowManager.selectAllEdges).toHaveBeenCalledWith("s1");
	});

	it("grise 'Coller' quand le presse-papiers n'est pas collable, l'active sinon", () => {
		const [, [pasteDisabled]] = items(fakeWorkflowManager([], []), false);
		expect(pasteDisabled.disabled).toBe(true);

		const [, [pasteEnabled]] = items(fakeWorkflowManager([], []), true);
		expect(pasteEnabled.disabled).toBe(false);
	});

	it("colle à la position écran du clic droit", () => {
		const ccp = fakeCopyCutPasteManager();
		const [, [pasteItem]] = items(fakeWorkflowManager([], []), true, ccp);

		pasteItem.onClick();

		expect(ccp.pasteElements).toHaveBeenCalledWith(SCREEN_POSITION);
	});
});
