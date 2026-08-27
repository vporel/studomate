import { LADDER_CONNECTION_EDGE_TYPE } from "@/ui/utils/ladder/ladder-flow-builder";
import nodeOrEdgeContextMenuItems from "./node-or-edge-context-menu-items";

describe("nodeOrEdgeContextMenuItems", () => {
	it("supprime une arête via handleDelete({ edges: [...] })", () => {
		const handleDelete = jest.fn();
		const edge = { id: "e1", type: LADDER_CONNECTION_EDGE_TYPE } as any;

		const [[deleteItem]] = nodeOrEdgeContextMenuItems(edge, handleDelete);
		deleteItem.onClick!();

		expect(handleDelete).toHaveBeenCalledWith({
			nodes: [],
			edges: [{ id: "e1" }],
		});
	});

	it("supprime un nœud via handleDelete({ nodes: [...] })", () => {
		const handleDelete = jest.fn();
		const node = { id: "contact-1", type: "contact" } as any;

		const [[deleteItem]] = nodeOrEdgeContextMenuItems(node, handleDelete);
		deleteItem.onClick!();

		expect(handleDelete).toHaveBeenCalledWith({
			nodes: [{ id: "contact-1" }],
			edges: [],
		});
	});

	it("ne supprime rien pour l'élément 'pane'", () => {
		const handleDelete = jest.fn();
		const pane = { type: "pane" } as any;

		const [[deleteItem]] = nodeOrEdgeContextMenuItems(pane, handleDelete);
		deleteItem.onClick!();

		expect(handleDelete).not.toHaveBeenCalled();
	});
});
