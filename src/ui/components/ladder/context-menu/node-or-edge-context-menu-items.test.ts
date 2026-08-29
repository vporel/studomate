import { LADDER_CONNECTION_EDGE_TYPE } from "@/ui/utils/ladder/ladder-flow-builder";
import nodeOrEdgeContextMenuItems from "./node-or-edge-context-menu-items";

const fakeCopyCutPasteManager = () =>
	({
		copySelectedElements: jest.fn(),
		cutSelectedElements: jest.fn(),
	}) as any;

function deleteItemFor(element: any, handleDelete: jest.Mock) {
	const [, [deleteItem]] = nodeOrEdgeContextMenuItems(
		element,
		handleDelete,
		fakeCopyCutPasteManager(),
	);
	return deleteItem;
}

describe("nodeOrEdgeContextMenuItems", () => {
	it("supprime une arête via handleDelete({ edges: [...] })", () => {
		const handleDelete = jest.fn();
		const edge = { id: "e1", type: LADDER_CONNECTION_EDGE_TYPE } as any;

		deleteItemFor(edge, handleDelete).onClick!();

		expect(handleDelete).toHaveBeenCalledWith({
			nodes: [],
			edges: [{ id: "e1" }],
		});
	});

	it("supprime un nœud via handleDelete({ nodes: [...] })", () => {
		const handleDelete = jest.fn();
		const node = { id: "contact-1", type: "contact" } as any;

		deleteItemFor(node, handleDelete).onClick!();

		expect(handleDelete).toHaveBeenCalledWith({
			nodes: [{ id: "contact-1" }],
			edges: [],
		});
	});

	it("ne supprime rien pour l'élément 'pane'", () => {
		const handleDelete = jest.fn();

		deleteItemFor({ type: "pane" } as any, handleDelete).onClick!();

		expect(handleDelete).not.toHaveBeenCalled();
	});

	it("délègue Copier / Couper au gestionnaire copier-coller", () => {
		const ccp = fakeCopyCutPasteManager();
		const [[copyItem, cutItem]] = nodeOrEdgeContextMenuItems(
			{ id: "contact-1", type: "contact" } as any,
			jest.fn(),
			ccp,
		);

		copyItem.onClick!();
		cutItem.onClick!();

		expect(ccp.copySelectedElements).toHaveBeenCalled();
		expect(ccp.cutSelectedElements).toHaveBeenCalled();
	});
});
