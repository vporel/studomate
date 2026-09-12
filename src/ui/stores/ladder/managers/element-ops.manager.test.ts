import CommandsStack from "@/schemas/commands/commands-stack.schema";
import ConnectionsRemoveCommand from "@/schemas/ladder/commands/connections-remove.command";
import ElementUpdateCommand from "@/schemas/ladder/commands/element-update.command";
import ElementsRemoveCommand from "@/schemas/ladder/commands/elements-remove.command";
import Connection from "@/schemas/ladder/connection.schema";
import {
	createCoilElement,
	createContactElement,
	createRailTerminalElement,
} from "@/schemas/ladder/element.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Section from "@/schemas/ladder/section.schema";
import LadderNodesFactory from "../factories/nodes.factory";
import { createLadderStore } from "../ladder.store";
import LadderElementOpsManager from "./element-ops.manager";

describe("LadderElementOpsManager", () => {
	const executeOperation = jest.fn();
	const commandsStackManager = { executeOperation };

	afterEach(() => jest.clearAllMocks());

	function setup(section: Section) {
		const ladder = new Ladder("l1", "L", [section]);
		let state = {
			ladder,
			nodesBySectionId: {
				[section.id]: LadderNodesFactory.getInitialNodes(section),
			},
			edgesBySectionId: { [section.id]: [] as any[] },
			pendingSystemBlockEdit: null as any,
			commandsStackManager: commandsStackManager as any,
		};
		const setStoreState = jest.fn((partial: any) => {
			state = {
				...state,
				...(typeof partial === "function" ? partial(state) : partial),
			};
		});
		const getStoreState = jest.fn(() => state as any);
		const manager = new LadderElementOpsManager(
			setStoreState as any,
			getStoreState as any,
		);
		return { manager, getState: () => state };
	}

	describe("setCoilType", () => {
		it("dispatche ElementUpdateCommand avec l'ancien et le nouveau type", () => {
			const section = new Section("s1", "S");
			const coil = createCoilElement("Q1", "normal", 0, 3);
			section.elements = [coil];
			const { manager } = setup(section);

			manager.setCoilType(section.id, coil.id, "set");

			expect(executeOperation).toHaveBeenCalledWith([
				new ElementUpdateCommand({
					elementId: coil.id,
					changes: { data: { type: "set" } },
					previousChanges: { data: { type: "normal" } },
				}),
			]);
		});

		it("ne fait rien si la bobine porte déjà ce type", () => {
			const section = new Section("s1", "S");
			const coil = createCoilElement("Q1", "reset", 0, 3);
			section.elements = [coil];
			const { manager } = setup(section);

			manager.setCoilType(section.id, coil.id, "reset");

			expect(executeOperation).not.toHaveBeenCalled();
		});

		it("ne fait rien si l'élément n'est pas une bobine", () => {
			const section = new Section("s1", "S");
			const contact = createContactElement("A", "NO", 0, 0);
			section.elements = [contact];
			const { manager } = setup(section);

			manager.setCoilType(section.id, contact.id, "set");

			expect(executeOperation).not.toHaveBeenCalled();
		});
	});

	describe("setContactType", () => {
		it("dispatche ElementUpdateCommand avec l'ancien et le nouveau type", () => {
			const section = new Section("s1", "S");
			const contact = createContactElement("A", "NO", 0, 0);
			section.elements = [contact];
			const { manager } = setup(section);

			manager.setContactType(section.id, contact.id, "NF");

			expect(executeOperation).toHaveBeenCalledWith([
				new ElementUpdateCommand({
					elementId: contact.id,
					changes: { data: { type: "NF" } },
					previousChanges: { data: { type: "NO" } },
				}),
			]);
		});

		it("ne fait rien si le contact porte déjà ce type", () => {
			const section = new Section("s1", "S");
			const contact = createContactElement("A", "NF", 0, 0);
			section.elements = [contact];
			const { manager } = setup(section);

			manager.setContactType(section.id, contact.id, "NF");

			expect(executeOperation).not.toHaveBeenCalled();
		});

		it("ne fait rien si l'élément n'est pas un contact", () => {
			const section = new Section("s1", "S");
			const coil = createCoilElement("Q1", "normal", 0, 3);
			section.elements = [coil];
			const { manager } = setup(section);

			manager.setContactType(section.id, coil.id, "NF");

			expect(executeOperation).not.toHaveBeenCalled();
		});
	});

	describe("deleteElements", () => {
		it("retire un élément et les connexions qui le touchent", () => {
			const section = new Section("s1", "S");
			const railTerminal = createRailTerminalElement(0);
			const contact = createContactElement("A", "NO", 0, 0);
			const coil = createCoilElement("Q1", "normal", 0, 1);
			section.elements = [railTerminal, contact, coil];
			const connection = new Connection(
				"c1",
				{ id: railTerminal.id, type: "contact", handle: "source" },
				{ id: contact.id, type: "coil", handle: "target" },
			);
			section.connections = [
				connection,
				new Connection(
					"c2",
					{ id: contact.id, type: "contact", handle: "source" },
					{ id: coil.id, type: "coil", handle: "target" },
				),
			];
			const { manager } = setup(section);

			manager.deleteElements(section.id, [contact.id]);

			expect(executeOperation).toHaveBeenCalledTimes(1);
			const [commands] = executeOperation.mock.calls[0];
			expect(commands).toHaveLength(1);
			const [command] = commands;
			expect(command).toBeInstanceOf(ElementsRemoveCommand);
			expect(command.payload.elements).toEqual([
				{ sectionId: section.id, element: contact },
			]);
			expect(
				command.payload.connections.map((c: any) => c.connection.id).sort(),
			).toEqual(["c1", "c2"]);
		});

		it("ignore les nœuds virtuels (bornes d'alimentation non persistées)", () => {
			const section = new Section("s1", "S");
			const { manager } = setup(section);

			manager.deleteElements(section.id, ["virtual-rail-0"]);

			expect(executeOperation).not.toHaveBeenCalled();
		});

		it("retire une connexion isolée via ConnectionsRemoveCommand", () => {
			const section = new Section("s1", "S");
			const contact = createContactElement("A", "NO", 0, 0);
			const coil = createCoilElement("Q1", "normal", 0, 1);
			section.elements = [contact, coil];
			const connection = new Connection(
				"c1",
				{ id: contact.id, type: "contact", handle: "source" },
				{ id: coil.id, type: "coil", handle: "target" },
			);
			section.connections = [connection];
			const { manager } = setup(section);

			manager.deleteElements(section.id, [], ["c1"]);

			expect(executeOperation).toHaveBeenCalledTimes(1);
			const [commands] = executeOperation.mock.calls[0];
			expect(commands).toHaveLength(1);
			const [command] = commands;
			expect(command).toBeInstanceOf(ConnectionsRemoveCommand);
			expect(command.payload).toEqual({
				sectionId: section.id,
				connections: [connection],
			});
		});

		it("ne dispatche rien si rien n'est à retirer", () => {
			const section = new Section("s1", "S");
			const { manager } = setup(section);

			manager.deleteElements(section.id, [], []);

			expect(executeOperation).not.toHaveBeenCalled();
		});

		it("ne fait rien pour une section inconnue", () => {
			const section = new Section("s1", "S");
			const { manager } = setup(section);

			manager.deleteElements("unknown-section", ["some-id"]);

			expect(executeOperation).not.toHaveBeenCalled();
		});
	});

	describe("openSystemBlockEditor", () => {
		it("pose pendingSystemBlockEdit avec le type, l'élément et les paramètres initiaux", () => {
			const section = new Section("s1", "S");
			const { manager, getState } = setup(section);
			const initial = { preset: 1000 } as any;

			manager.openSystemBlockEditor("blk-1", "timer", initial);

			expect(getState().pendingSystemBlockEdit).toEqual({
				blockType: "timer",
				elementId: "blk-1",
				initial,
			});
		});
	});

	describe("deleteSections", () => {
		function buildManager(ids: string[]) {
			const ladder = new Ladder(
				"l1",
				"L",
				ids.map((id) => new Section(id, id.toUpperCase())),
			);
			const store = createLadderStore(ladder, new CommandsStack<Ladder>(100));
			const manager = new LadderElementOpsManager(
				store.setState as any,
				store.getState as any,
			);
			return { store, manager };
		}

		it("supprime les sections demandées en une opération annulable", () => {
			const { store, manager } = buildManager(["s1", "s2", "s3", "s4"]);

			manager.deleteSections(["s2", "s4"]);
			expect(store.getState().ladder.sections.map((s) => s.id)).toEqual([
				"s1",
				"s3",
			]);

			store.getState().commandsStackManager.undoOperation();
			expect(store.getState().ladder.sections.map((s) => s.id)).toEqual([
				"s1",
				"s2",
				"s3",
				"s4",
			]);
		});

		it("conserve la première section du tableau si toutes sont sélectionnées", () => {
			const { store, manager } = buildManager(["s1", "s2", "s3"]);

			manager.deleteSections(["s3", "s2", "s1"]);

			expect(store.getState().ladder.sections.map((s) => s.id)).toEqual(["s1"]);
		});

		it("ne fait rien si le ladder n'a qu'une section", () => {
			const { store, manager } = buildManager(["s1"]);

			manager.deleteSections(["s1"]);

			expect(store.getState().ladder.sections.map((s) => s.id)).toEqual(["s1"]);
		});

		it("ne fait rien si aucune des sections demandées n'existe", () => {
			const { store, manager } = buildManager(["s1", "s2"]);

			manager.deleteSections(["nope"]);

			expect(store.getState().ladder.sections).toHaveLength(2);
		});
	});
});
