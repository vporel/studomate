/**
 * @jest-environment jsdom
 */
import CommandsStack from "@/schemas/commands/commands-stack.schema";
import Connection from "@/schemas/ladder/connection.schema";
import {
	createContactElement,
	createCoilElement,
} from "@/schemas/ladder/element.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Section from "@/schemas/ladder/section.schema";
import { LadderNodeType } from "@/ui/components/ladder/flow/ladder-nodes-definitions";
import {
	clearClipboard,
	setClipboardEntry,
} from "@/ui/stores/shared/clipboard.store";
import {
	GRID_CELL_HEIGHT,
	GRID_CELL_WIDTH,
	POWER_RAIL_OFFSET,
} from "@/ui/utils/ladder/ladder-flow-builder";
import { createLadderStore } from "../ladder.store";

/** `pasteElements` n'a besoin que de `screenToFlowPosition` de l'instance React Flow. */
function fakeRfInstance(flowPosition: { x: number; y: number }) {
	return { screenToFlowPosition: () => flowPosition } as any;
}

function buildStore() {
	const contact = createContactElement("Capteur", "NO", 0, 3);
	const section = new Section("s1", "Section", "", [contact]);
	const ladder = new Ladder("l1", "TestLadder", [section]);
	const store = createLadderStore(ladder, new CommandsStack<Ladder>(100));
	return { store, contactId: contact.id };
}

function selectNode(
	store: ReturnType<typeof buildStore>["store"],
	sectionId: string,
	nodeId: string,
) {
	store.setState((state) => ({
		nodesBySectionId: {
			...state.nodesBySectionId,
			[sectionId]: state.nodesBySectionId[sectionId].map((n) =>
				n.id === nodeId ? { ...n, selected: true } : n,
			) as LadderNodeType[],
		},
	}));
}

/** Simule le survol de la section au moment du collage — `pasteElements` retrouve la section
 * sous le curseur via `document.elementsFromPoint`, absent de jsdom par défaut. */
function stubElementsFromPoint(sectionId: string) {
	const sectionDiv = document.createElement("div");
	sectionDiv.setAttribute("data-section-id", sectionId);
	document.elementsFromPoint = jest.fn().mockReturnValue([sectionDiv]);
}

describe("LadderCopyCutPasteManager (ladder)", () => {
	beforeEach(() => clearClipboard());

	describe("copySelectedElements / pasteElements", () => {
		it("ne colle rien si le presse-papiers est vide", () => {
			const { store } = buildStore();
			stubElementsFromPoint("s1");
			store
				.getState()
				.viewManager.registerInstance("s1", fakeRfInstance({ x: 0, y: 0 }));

			store.getState().copyCutPasteManager.pasteElements({ x: 10, y: 10 });

			expect(store.getState().ladder.getSection("s1")!.elements).toHaveLength(
				1,
			);
		});

		it("ne colle rien si rien n'est sélectionné", () => {
			const { store } = buildStore();

			store.getState().copyCutPasteManager.copySelectedElements();
			store.getState().copyCutPasteManager.pasteElements({ x: 10, y: 10 });

			expect(store.getState().ladder.getSection("s1")!.elements).toHaveLength(
				1,
			);
		});

		it("ne colle rien sans position de souris", () => {
			const { store, contactId } = buildStore();
			selectNode(store, "s1", contactId);
			store.getState().copyCutPasteManager.copySelectedElements();

			store.getState().copyCutPasteManager.pasteElements();

			expect(store.getState().ladder.getSection("s1")!.elements).toHaveLength(
				1,
			);
		});

		it("ne colle rien si la position de la souris n'est au-dessus d'aucune section", () => {
			const { store, contactId } = buildStore();
			document.elementsFromPoint = jest
				.fn()
				.mockReturnValue([document.createElement("div")]);
			selectNode(store, "s1", contactId);
			store.getState().copyCutPasteManager.copySelectedElements();

			store.getState().copyCutPasteManager.pasteElements({ x: 10, y: 10 });

			expect(store.getState().ladder.getSection("s1")!.elements).toHaveLength(
				1,
			);
		});

		it("colle une copie de l'élément sélectionné avec un nouvel identifiant", () => {
			const { store, contactId } = buildStore();
			stubElementsFromPoint("s1");
			const flowPosition = {
				x: POWER_RAIL_OFFSET + 3 * GRID_CELL_WIDTH,
				y: 5 * GRID_CELL_HEIGHT,
			};
			store
				.getState()
				.viewManager.registerInstance("s1", fakeRfInstance(flowPosition));
			selectNode(store, "s1", contactId);
			store.getState().copyCutPasteManager.copySelectedElements();

			store.getState().copyCutPasteManager.pasteElements({ x: 10, y: 10 });

			const elements = store.getState().ladder.getSection("s1")!.elements;
			expect(elements).toHaveLength(2);
			expect(
				elements.some((e) => e.id !== contactId && e.type === "contact"),
			).toBe(true);
		});

		it("ne modifie pas l'élément original", () => {
			const { store, contactId } = buildStore();
			stubElementsFromPoint("s1");
			const flowPosition = {
				x: POWER_RAIL_OFFSET + 3 * GRID_CELL_WIDTH,
				y: 5 * GRID_CELL_HEIGHT,
			};
			store
				.getState()
				.viewManager.registerInstance("s1", fakeRfInstance(flowPosition));
			selectNode(store, "s1", contactId);
			store.getState().copyCutPasteManager.copySelectedElements();

			store.getState().copyCutPasteManager.pasteElements({ x: 10, y: 10 });

			const original = store
				.getState()
				.ladder.getSection("s1")!
				.getElement(contactId);
			expect(original).toMatchObject({
				position: { row: 0, col: 3 },
				data: { variable: "Capteur", type: "NO" },
			});
		});
	});

	describe("collage réel avec connexion interne à la sélection", () => {
		it("recrée la connexion entre les deux éléments copiés, avec de nouveaux ids", () => {
			const contact = createContactElement("Capteur", "NO", 0, 0);
			const coil = createCoilElement("Sortie", "normal", 0, 1);
			const connection = new Connection(
				"c1",
				{ id: contact.id, type: "contact", handle: "source" },
				{ id: coil.id, type: "coil", handle: "target" },
				{ points: [[0, 0]] },
			);
			const section = new Section(
				"s1",
				"Section",
				"",
				[contact, coil],
				[connection],
			);
			const ladder = new Ladder("l1", "TestLadder", [section]);
			const store = createLadderStore(ladder, new CommandsStack<Ladder>(100));
			stubElementsFromPoint("s1");
			const flowPosition = {
				x: POWER_RAIL_OFFSET + 5 * GRID_CELL_WIDTH,
				y: 5 * GRID_CELL_HEIGHT,
			};
			store
				.getState()
				.viewManager.registerInstance("s1", fakeRfInstance(flowPosition));

			store
				.getState()
				.copyCutPasteManager.copyElements([contact, coil], [connection]);
			store.getState().copyCutPasteManager.pasteElements({ x: 10, y: 10 });

			const pastedSection = store.getState().ladder.getSection("s1")!;
			expect(pastedSection.connections).toHaveLength(2); // l'originale + la copiée
			const pastedConnection = pastedSection.connections.find(
				(c) => c.id !== "c1",
			)!;
			expect(pastedConnection).toBeDefined();
			const pastedElementIds = pastedSection.elements
				.filter((e) => e.id !== contact.id && e.id !== coil.id)
				.map((e) => e.id);
			expect(pastedElementIds).toContain(pastedConnection.source.id);
			expect(pastedElementIds).toContain(pastedConnection.target.id);
		});
	});

	describe("presse-papiers partagé entre pages", () => {
		it("colle dans un autre ladder ce qui a été copié dans le premier", () => {
			const { store: storeA, contactId } = buildStore();
			selectNode(storeA, "s1", contactId);
			storeA.getState().copyCutPasteManager.copySelectedElements();

			const sectionB = new Section("s2", "Section B", "", []);
			const ladderB = new Ladder("l2", "LadderB", [sectionB]);
			const storeB = createLadderStore(ladderB, new CommandsStack<Ladder>(100));
			stubElementsFromPoint("s2");
			storeB
				.getState()
				.viewManager.registerInstance(
					"s2",
					fakeRfInstance({
						x: POWER_RAIL_OFFSET + 3 * GRID_CELL_WIDTH,
						y: 5 * GRID_CELL_HEIGHT,
					}),
				);

			storeB.getState().copyCutPasteManager.pasteElements({ x: 10, y: 10 });

			expect(
				storeB.getState().ladder.getSection("s2")!.elements.length,
			).toBeGreaterThan(0);
			expect(storeA.getState().ladder.getSection("s1")!.elements).toHaveLength(1);
		});

		it("ne colle rien si le presse-papiers vient d'un autre type de page", () => {
			const { store } = buildStore();
			stubElementsFromPoint("s1");
			store
				.getState()
				.viewManager.registerInstance("s1", fakeRfInstance({ x: 0, y: 0 }));
			setClipboardEntry({ scope: "grafcet", data: { nodes: [], edges: [] } });

			store.getState().copyCutPasteManager.pasteElements({ x: 10, y: 10 });

			expect(store.getState().ladder.getSection("s1")!.elements).toHaveLength(1);
		});

		it("ne colle rien après vidage du presse-papiers (changement de projet)", () => {
			const { store, contactId } = buildStore();
			stubElementsFromPoint("s1");
			store
				.getState()
				.viewManager.registerInstance("s1", fakeRfInstance({ x: 0, y: 0 }));
			selectNode(store, "s1", contactId);
			store.getState().copyCutPasteManager.copySelectedElements();

			clearClipboard();
			store.getState().copyCutPasteManager.pasteElements({ x: 10, y: 10 });

			expect(store.getState().ladder.getSection("s1")!.elements).toHaveLength(1);
		});
	});

	describe("cutSelectedElements", () => {
		it("copie puis retire l'élément sélectionné de la section", () => {
			const { store, contactId } = buildStore();
			selectNode(store, "s1", contactId);

			store.getState().copyCutPasteManager.cutSelectedElements();

			expect(store.getState().ladder.getSection("s1")!.elements).toHaveLength(
				0,
			);
			stubElementsFromPoint("s1");
			store
				.getState()
				.viewManager.registerInstance("s1", fakeRfInstance({ x: 0, y: 0 }));
			store.getState().copyCutPasteManager.pasteElements({ x: 10, y: 10 });
			expect(
				store
					.getState()
					.ladder.getSection("s1")!
					.elements.some((e) => e.type === "contact"),
			).toBe(true);
		});

		it("ne fait rien quand rien n'est sélectionné", () => {
			const { store } = buildStore();

			store.getState().copyCutPasteManager.cutSelectedElements();

			expect(store.getState().ladder.getSection("s1")!.elements).toHaveLength(
				1,
			);
		});
	});
});
