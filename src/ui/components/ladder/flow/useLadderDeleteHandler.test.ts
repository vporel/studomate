/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import Connection from "@/schemas/ladder/connection.schema";
import Section from "@/schemas/ladder/section.schema";
import { createContactElement, createCoilElement, createRailTerminalElement } from "@/schemas/ladder/element.schema";
import ElementsRemoveCommand from "@/schemas/ladder/commands/elements-remove.command";
import ConnectionsRemoveCommand from "@/schemas/ladder/commands/connections-remove.command";
import { useLadderStore } from "../context/LadderContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import useLadderDeleteHandler from "./useLadderDeleteHandler";

jest.mock("../context/LadderContext", () => ({
	useLadderStore: jest.fn(),
}));

describe("useLadderDeleteHandler", () => {
	const executeOperation = jest.fn();
	const commandsStackManager = { executeOperation };

	afterEach(() => jest.clearAllMocks());

	function setup(section: Section) {
		(useLadderStore as jest.Mock).mockImplementation(selectorImplementation({ commandsStackManager }));
		return renderHook(() => useLadderDeleteHandler(section));
	}

	it("retire un élément et les connexions qui le touchent", () => {
		const section = new Section("s1", "S");
		const railTerminal = createRailTerminalElement(0);
		const contact = createContactElement("A", "NO", 0, 0);
		const coil = createCoilElement("Q1", "normal", 0, 1);
		section.elements = [railTerminal, contact, coil];
		const connection = new Connection("c1", { id: railTerminal.id, type: "contact", handle: "source" }, { id: contact.id, type: "coil", handle: "target" });
		section.connections = [connection, new Connection("c2", { id: contact.id, type: "contact", handle: "source" }, { id: coil.id, type: "coil", handle: "target" })];
		const { result } = setup(section);

		result.current({ nodes: [{ id: contact.id } as any], edges: [] });

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [commands] = executeOperation.mock.calls[0];
		expect(commands).toHaveLength(1);
		const [command] = commands;
		expect(command).toBeInstanceOf(ElementsRemoveCommand);
		expect(command.payload.elements).toEqual([{ sectionId: section.id, element: contact }]);
		expect(command.payload.connections.map((c: any) => c.connection.id).sort()).toEqual(["c1", "c2"]);
	});

	it("ignore les nœuds virtuels (bornes d'alimentation non persistées)", () => {
		const section = new Section("s1", "S");
		const { result } = setup(section);

		result.current({ nodes: [{ id: "virtual-rail-0" } as any], edges: [] });

		expect(executeOperation).not.toHaveBeenCalled();
	});

	it("retire une connexion isolée via ConnectionsRemoveCommand", () => {
		const section = new Section("s1", "S");
		const contact = createContactElement("A", "NO", 0, 0);
		const coil = createCoilElement("Q1", "normal", 0, 1);
		section.elements = [contact, coil];
		const connection = new Connection("c1", { id: contact.id, type: "contact", handle: "source" }, { id: coil.id, type: "coil", handle: "target" });
		section.connections = [connection];
		const { result } = setup(section);

		result.current({ nodes: [], edges: [{ id: "c1" } as any] });

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [commands] = executeOperation.mock.calls[0];
		expect(commands).toHaveLength(1);
		const [command] = commands;
		expect(command).toBeInstanceOf(ConnectionsRemoveCommand);
		expect(command.payload).toEqual({ sectionId: section.id, connections: [connection] });
	});

	it("ne dispatche rien si rien n'est à retirer", () => {
		const section = new Section("s1", "S");
		const { result } = setup(section);

		result.current({ nodes: [], edges: [] });

		expect(executeOperation).not.toHaveBeenCalled();
	});
});
