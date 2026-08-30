/**
 * @jest-environment jsdom
 */
import CommandsStack from "@/schemas/commands/commands-stack.schema";
import Connection from "@/schemas/ladder/connection.schema";
import {
	createContactElement,
	createCoilElement,
} from "@/schemas/ladder/element.schema";
import {
	createTimerBlockElement,
	getTimerBlockParams,
} from "@/schemas/ladder/function-blocks/timer.schema";
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

	describe("collage d'un bloc à instance nommée", () => {
		it("suffixe le nom du bloc timer collé pour ne pas dupliquer l'instance d'origine", () => {
			const timer = createTimerBlockElement(
				{ name: "Tempo", timerType: "TON", pt: "T#5s" },
				0,
				0,
			);
			const section = new Section("s1", "Section", "", [timer]);
			const ladder = new Ladder("l1", "TestLadder", [section]);
			const store = createLadderStore(ladder, new CommandsStack<Ladder>(100));
			stubElementsFromPoint("s1");
			store.getState().viewManager.registerInstance(
				"s1",
				fakeRfInstance({
					x: POWER_RAIL_OFFSET + 5 * GRID_CELL_WIDTH,
					y: 5 * GRID_CELL_HEIGHT,
				}),
			);

			store.getState().copyCutPasteManager.copyElements([timer], []);
			store.getState().copyCutPasteManager.pasteElements({ x: 10, y: 10 });

			const elements = store.getState().ladder.getSection("s1")!.elements;
			expect(elements).toHaveLength(2);
			const pasted = elements.find(
				(e) => e.id !== timer.id,
			)! as typeof timer;
			expect(getTimerBlockParams(pasted)?.name).toBe("Tempo_2");
			expect(getTimerBlockParams(timer)?.name).toBe("Tempo");
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

	describe("duplicateSection", () => {
		function buildMultiSectionStore() {
			const contact = createContactElement("Capteur", "NO", 0, 0);
			const coil = createCoilElement("Sortie", "normal", 0, 1);
			const connection = new Connection(
				"c1",
				{ id: contact.id, type: "contact", handle: "source" },
				{ id: coil.id, type: "coil", handle: "target" },
				{ points: [[0, 0]] },
			);
			const s1 = new Section("s1", "Départ moteur", "commande principale", [
				contact,
				coil,
			], [connection]);
			const s2 = new Section("s2", "Arrêt", "", []);
			const ladder = new Ladder("l1", "TestLadder", [s1, s2]);
			const store = createLadderStore(ladder, new CommandsStack<Ladder>(100));
			return { store, contact, coil };
		}

		it("insère la copie juste sous l'originale, avec même titre et description", () => {
			const { store } = buildMultiSectionStore();

			store.getState().copyCutPasteManager.duplicateSection("s1");

			const sections = store.getState().ladder.sections;
			expect(sections).toHaveLength(3);
			expect(sections[0].id).toBe("s1");
			expect(sections[2].id).toBe("s2");
			const copy = sections[1];
			expect(copy.id).not.toBe("s1");
			expect(copy.title).toBe("Départ moteur");
			expect(copy.description).toBe("commande principale");
		});

		it("recrée les éléments et connexions avec de nouveaux identifiants", () => {
			const { store, contact, coil } = buildMultiSectionStore();

			store.getState().copyCutPasteManager.duplicateSection("s1");

			const copy = store.getState().ladder.sections[1];
			expect(copy.elements).toHaveLength(2);
			expect(copy.elements.map((e) => e.id)).not.toContain(contact.id);
			expect(copy.elements.map((e) => e.id)).not.toContain(coil.id);
			expect(copy.connections).toHaveLength(1);
			const conn = copy.connections[0];
			expect(conn.id).not.toBe("c1");
			expect(copy.elements.map((e) => e.id)).toEqual(
				expect.arrayContaining([conn.source.id, conn.target.id]),
			);
		});

		it("suffixe le nom des blocs timer pour ne pas dupliquer l'instance", () => {
			const timer = createTimerBlockElement(
				{ name: "Tempo", timerType: "TON", pt: "T#5s" },
				0,
				0,
			);
			const s1 = new Section("s1", "Section", "", [timer]);
			const ladder = new Ladder("l1", "TestLadder", [s1]);
			const store = createLadderStore(ladder, new CommandsStack<Ladder>(100));

			store.getState().copyCutPasteManager.duplicateSection("s1");

			const copy = store.getState().ladder.sections[1];
			expect(getTimerBlockParams(copy.elements[0] as typeof timer)?.name).toBe(
				"Tempo_2",
			);
			expect(getTimerBlockParams(timer)?.name).toBe("Tempo");
		});

		it("ne modifie pas la section d'origine", () => {
			const { store, contact } = buildMultiSectionStore();

			store.getState().copyCutPasteManager.duplicateSection("s1");

			const original = store.getState().ladder.getSection("s1")!;
			expect(original.elements).toHaveLength(2);
			expect(original.getElement(contact.id)).toBeDefined();
			expect(original.connections[0].id).toBe("c1");
		});

		it("est annulable d'un bloc", () => {
			const { store } = buildMultiSectionStore();

			store.getState().copyCutPasteManager.duplicateSection("s1");
			store.getState().commandsStackManager.undoOperation();

			const sections = store.getState().ladder.sections;
			expect(sections.map((s) => s.id)).toEqual(["s1", "s2"]);
		});

		it("ne fait rien pour une section inconnue", () => {
			const { store } = buildMultiSectionStore();

			store.getState().copyCutPasteManager.duplicateSection("nope");

			expect(store.getState().ladder.sections).toHaveLength(2);
		});
	});

	describe("copySections / pasteSections", () => {
		function buildMultiSectionStore() {
			const contact = createContactElement("Capteur", "NO", 0, 0);
			const coil = createCoilElement("Sortie", "normal", 0, 1);
			const connection = new Connection(
				"c1",
				{ id: contact.id, type: "contact", handle: "source" },
				{ id: coil.id, type: "coil", handle: "target" },
				{ points: [[0, 0]] },
			);
			const s1 = new Section(
				"s1",
				"Départ moteur",
				"commande principale",
				[contact, coil],
				[connection],
			);
			const s2 = new Section("s2", "Arrêt", "", []);
			const s3 = new Section("s3", "Sécurité", "", []);
			const ladder = new Ladder("l1", "TestLadder", [s1, s2, s3]);
			const store = createLadderStore(ladder, new CommandsStack<Ladder>(100));
			return { store, contact, coil };
		}

		it("copySelectedElements délègue à copySections quand des sections sont sélectionnées", () => {
			const { store } = buildMultiSectionStore();
			store.getState().setSelectedSectionIds(["s1"]);

			store.getState().copyCutPasteManager.copySelectedElements();

			store.getState().setActiveSectionId("s2");
			store.getState().copyCutPasteManager.pasteElements();

			const sections = store.getState().ladder.sections;
			expect(sections).toHaveLength(4);
			expect(sections.map((s) => s.id)).toEqual([
				"s1",
				"s2",
				expect.any(String),
				"s3",
			]);
			expect(sections[2].title).toBe("Départ moteur");
			expect(sections[2].elements).toHaveLength(2);
		});

		it("colle la section juste sous la section active", () => {
			const { store } = buildMultiSectionStore();
			store.getState().copyCutPasteManager.copySections(["s1"]);
			store.getState().setActiveSectionId("s2");

			store.getState().copyCutPasteManager.pasteElements();

			const sections = store.getState().ladder.sections;
			expect(sections.map((s) => s.id)).toEqual([
				"s1",
				"s2",
				expect.any(String),
				"s3",
			]);
			expect(sections[2].id).not.toBe("s1");
		});

		it("colle la section tout en bas quand aucune section n'est active", () => {
			const { store } = buildMultiSectionStore();
			store.getState().copyCutPasteManager.copySections(["s1"]);

			store.getState().copyCutPasteManager.pasteElements();

			const sections = store.getState().ladder.sections;
			expect(sections.map((s) => s.id).slice(0, 3)).toEqual(["s1", "s2", "s3"]);
			expect(sections).toHaveLength(4);
			expect(sections[3].title).toBe("Départ moteur");
		});

		it("recrée éléments et connexions avec de nouveaux identifiants", () => {
			const { store, contact, coil } = buildMultiSectionStore();
			store.getState().copyCutPasteManager.copySections(["s1"]);

			store.getState().copyCutPasteManager.pasteElements();

			const pasted = store.getState().ladder.sections[3];
			expect(pasted.elements.map((e) => e.id)).not.toContain(contact.id);
			expect(pasted.elements.map((e) => e.id)).not.toContain(coil.id);
			expect(pasted.connections).toHaveLength(1);
			expect(pasted.connections[0].id).not.toBe("c1");
			expect(pasted.elements.map((e) => e.id)).toEqual(
				expect.arrayContaining([
					pasted.connections[0].source.id,
					pasted.connections[0].target.id,
				]),
			);
		});

		it("suffixe le nom des blocs pour rester une instance unique dans le ladder cible", () => {
			const timer = createTimerBlockElement(
				{ name: "Tempo", timerType: "TON", pt: "T#5s" },
				0,
				0,
			);
			const s1 = new Section("s1", "Section", "", [timer]);
			const ladder = new Ladder("l1", "TestLadder", [s1]);
			const store = createLadderStore(ladder, new CommandsStack<Ladder>(100));

			store.getState().copyCutPasteManager.copySections(["s1"]);
			store.getState().copyCutPasteManager.pasteElements();

			const pasted = store.getState().ladder.sections[1];
			expect(
				getTimerBlockParams(pasted.elements[0] as typeof timer)?.name,
			).toBe("Tempo_2");
			expect(getTimerBlockParams(timer)?.name).toBe("Tempo");
		});

		it("colle dans un autre ladder la section copiée dans le premier", () => {
			const { store: storeA } = buildMultiSectionStore();
			storeA.getState().copyCutPasteManager.copySections(["s1"]);

			const ladderB = new Ladder("l2", "LadderB", [
				new Section("b1", "Base", "", []),
			]);
			const storeB = createLadderStore(ladderB, new CommandsStack<Ladder>(100));

			storeB.getState().copyCutPasteManager.pasteElements();

			expect(storeB.getState().ladder.sections).toHaveLength(2);
			expect(storeB.getState().ladder.sections[1].title).toBe("Départ moteur");
			expect(storeA.getState().ladder.sections).toHaveLength(3);
		});

		it("le collage de section est annulable d'un bloc", () => {
			const { store } = buildMultiSectionStore();
			store.getState().copyCutPasteManager.copySections(["s1"]);
			store.getState().setActiveSectionId("s1");

			store.getState().copyCutPasteManager.pasteElements();
			store.getState().commandsStackManager.undoOperation();

			expect(store.getState().ladder.sections.map((s) => s.id)).toEqual([
				"s1",
				"s2",
				"s3",
			]);
		});

		it("ne modifie pas la section source", () => {
			const { store, contact } = buildMultiSectionStore();
			store.getState().copyCutPasteManager.copySections(["s1"]);
			store.getState().copyCutPasteManager.pasteElements();

			const source = store.getState().ladder.getSection("s1")!;
			expect(source.elements).toHaveLength(2);
			expect(source.getElement(contact.id)).toBeDefined();
			expect(source.connections[0].id).toBe("c1");
		});

		describe("sélection multiple", () => {
			it("copie les sections dans l'ordre du ladder quel que soit l'ordre des ids", () => {
				const { store } = buildMultiSectionStore();
				store.getState().copyCutPasteManager.copySections(["s3", "s1"]);
				store.getState().setActiveSectionId("s2");

				store.getState().copyCutPasteManager.pasteElements();

				const sections = store.getState().ladder.sections;
				expect(sections.map((s) => s.id)).toEqual([
					"s1",
					"s2",
					expect.any(String),
					expect.any(String),
					"s3",
				]);
				expect(sections[2].title).toBe("Départ moteur");
				expect(sections[3].title).toBe("Sécurité");
			});

			it("colle le bloc tout en bas quand aucune section n'est active", () => {
				const { store } = buildMultiSectionStore();
				store.getState().copyCutPasteManager.copySections(["s1", "s2"]);

				store.getState().copyCutPasteManager.pasteElements();

				const sections = store.getState().ladder.sections;
				expect(sections).toHaveLength(5);
				expect(sections.map((s) => s.title).slice(3)).toEqual([
					"Départ moteur",
					"Arrêt",
				]);
			});

			it("accumule le suffixage des noms de blocs entre sections collées", () => {
				const s1 = new Section("s1", "A", "", [
					createTimerBlockElement(
						{ name: "Tempo", timerType: "TON", pt: "T#5s" },
						0,
						0,
					),
				]);
				const s2 = new Section("s2", "B", "", [
					createTimerBlockElement(
						{ name: "Tempo", timerType: "TON", pt: "T#5s" },
						0,
						0,
					),
				]);
				const ladder = new Ladder("l1", "TestLadder", [s1, s2]);
				const store = createLadderStore(ladder, new CommandsStack<Ladder>(100));

				store.getState().copyCutPasteManager.copySections(["s1", "s2"]);
				store.getState().copyCutPasteManager.pasteElements();

				const names = store
					.getState()
					.ladder.getAllElements()
					.map((el) => getTimerBlockParams(el as any)?.name)
					.filter(Boolean)
					.sort();
				expect(names).toEqual(["Tempo", "Tempo", "Tempo_2", "Tempo_3"]);
			});

			it("le collage multi-sections est annulable d'un bloc", () => {
				const { store } = buildMultiSectionStore();
				store.getState().copyCutPasteManager.copySections(["s1", "s3"]);
				store.getState().setActiveSectionId("s1");

				store.getState().copyCutPasteManager.pasteElements();
				store.getState().commandsStackManager.undoOperation();

				expect(store.getState().ladder.sections.map((s) => s.id)).toEqual([
					"s1",
					"s2",
					"s3",
				]);
			});
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
