import { identityT } from "@tests/utils/i18n";
import { LADDER_CONNECTION_EDGE_TYPE } from "@/ui/utils/ladder/ladder-flow-builder";
import nodeOrEdgeContextMenuItems from "./node-or-edge-context-menu-items";

const fakeCopyCutPasteManager = () =>
	({
		copySelectedElements: jest.fn(),
		cutSelectedElements: jest.fn(),
	}) as any;

const fakeWorkflowManager = () =>
	({
		setContactType: jest.fn(),
		setCoilType: jest.fn(),
	}) as any;

function itemsFor(
	element: any,
	handleDelete: jest.Mock = jest.fn(),
	workflowManager = fakeWorkflowManager(),
	openCrossReferences: jest.Mock = jest.fn(),
) {
	return nodeOrEdgeContextMenuItems(
		element,
		"s1",
		handleDelete,
		fakeCopyCutPasteManager(),
		workflowManager,
		openCrossReferences,
		identityT,
	);
}

/** Le groupe « Supprimer » est toujours le dernier. */
function deleteItemFor(element: any, handleDelete: jest.Mock) {
	const groups = itemsFor(element, handleDelete);
	return groups[groups.length - 1][0];
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
		const node = { id: "contact-1", type: "contact", data: { type: "NO" } } as any;

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
			{ id: "e1", type: LADDER_CONNECTION_EDGE_TYPE } as any,
			"s1",
			jest.fn(),
			ccp,
			fakeWorkflowManager(),
			jest.fn(),
			identityT,
		);

		copyItem.onClick!();
		cutItem.onClick!();

		expect(ccp.copySelectedElements).toHaveBeenCalled();
		expect(ccp.cutSelectedElements).toHaveBeenCalled();
	});

	describe("sous-menu Type (contact)", () => {
		it("propose les 4 types, coche le type courant", () => {
			const node = {
				id: "contact-1",
				type: "contact",
				data: { type: "NF" },
			} as any;

			const typeItem = itemsFor(node)
				.flat()
				.find((item) => item.label === "type")!;

			expect(typeItem.subItems).toHaveLength(4);
			const checked = typeItem.subItems!.filter(
				(sub) => "checked" in sub && sub.checked,
			);
			expect(checked).toHaveLength(1);
			expect((checked[0] as any).label).toContain("NF");
		});

		it("change le type du contact via workflowManager.setContactType", () => {
			const workflowManager = fakeWorkflowManager();
			const node = {
				id: "contact-1",
				type: "contact",
				data: { type: "NO" },
			} as any;

			const typeItem = itemsFor(node, jest.fn(), workflowManager)
				.flat()
				.find((item) => item.label === "type")!;
			const toNF = typeItem.subItems!.find(
				(sub) => "label" in sub && sub.label.includes("NF"),
			) as any;
			toNF.onClick();

			expect(workflowManager.setContactType).toHaveBeenCalledWith(
				"s1",
				"contact-1",
				"NF",
			);
		});

		it("n'ajoute pas de sous-menu Type pour une arête", () => {
			const edge = { id: "e1", type: LADDER_CONNECTION_EDGE_TYPE } as any;

			const hasType = itemsFor(edge)
				.flat()
				.some((item) => item.label === "type");

			expect(hasType).toBe(false);
		});
	});

	describe("Références croisées", () => {
		it.each([
			["contact", { type: "NO", variable: "Dcy" }],
			["coil", { type: "normal", variable: "Moteur" }],
		])("ouvre le panneau sur la variable du %s", (type, data) => {
			const openCrossReferences = jest.fn();
			const node = { id: `${type}-1`, type, data } as any;

			const item = itemsFor(node, jest.fn(), fakeWorkflowManager(), openCrossReferences)
				.flat()
				.find((i) => i.label === "crossReferences")!;
			item.onClick!();

			expect(openCrossReferences).toHaveBeenCalledWith(data.variable);
		});

		it("place « Références croisées » dans son propre groupe, juste après « Type »", () => {
			const groups = itemsFor({
				id: "contact-1",
				type: "contact",
				data: { type: "NO", variable: "Dcy" },
			} as any);
			const typeGroupIndex = groups.findIndex((g) =>
				g.some((i) => i.label === "type"),
			);
			const xrefGroup = groups[typeGroupIndex + 1];
			expect(xrefGroup).toHaveLength(1);
			expect(xrefGroup[0].label).toBe("crossReferences");
		});

		it("n'apparaît pas pour une arête", () => {
			const has = itemsFor({ id: "e1", type: LADDER_CONNECTION_EDGE_TYPE } as any)
				.flat()
				.some((i) => i.label === "crossReferences");
			expect(has).toBe(false);
		});
	});

	describe("sous-menu Type (bobine)", () => {
		it("propose les 3 types, coche le type courant", () => {
			const node = {
				id: "coil-1",
				type: "coil",
				data: { type: "set" },
			} as any;

			const typeItem = itemsFor(node)
				.flat()
				.find((item) => item.label === "type")!;

			expect(typeItem.subItems).toHaveLength(3);
			const checked = typeItem.subItems!.filter(
				(sub) => "checked" in sub && sub.checked,
			);
			expect(checked).toHaveLength(1);
			expect((checked[0] as any).label).toContain("Set");
		});

		it("change le type de la bobine via workflowManager.setCoilType", () => {
			const workflowManager = fakeWorkflowManager();
			const node = {
				id: "coil-1",
				type: "coil",
				data: { type: "normal" },
			} as any;

			const typeItem = itemsFor(node, jest.fn(), workflowManager)
				.flat()
				.find((item) => item.label === "type")!;
			const toReset = typeItem.subItems!.find(
				(sub) => "label" in sub && sub.label.includes("Reset"),
			) as any;
			toReset.onClick();

			expect(workflowManager.setCoilType).toHaveBeenCalledWith(
				"s1",
				"coil-1",
				"reset",
			);
		});
	});
});
