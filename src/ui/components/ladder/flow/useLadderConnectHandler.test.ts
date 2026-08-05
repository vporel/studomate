/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import Section from "@/schemas/ladder/section.schema";
import { createContactElement, createCoilElement } from "@/schemas/ladder/element.schema";
import ConnectionsAddCommand from "@/schemas/ladder/commands/connections-add.command";
import ElementsAddCommand from "@/schemas/ladder/commands/elements-add.command";
import { virtualRailId } from "@/ui/utils/ladder/ladder-flow-builder";
import { useLadderStore } from "../context/LadderContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import useLadderConnectHandler from "./useLadderConnectHandler";

jest.mock("../context/LadderContext", () => ({
	useLadderStore: jest.fn(),
}));

describe("useLadderConnectHandler", () => {
	const executeOperation = jest.fn();
	const commandsStackManager = { executeOperation };

	afterEach(() => jest.clearAllMocks());

	function setup(section: Section) {
		(useLadderStore as jest.Mock).mockImplementation(selectorImplementation({ commandsStackManager }));
		return renderHook(() => useLadderConnectHandler(section));
	}

	it("dispatche ConnectionsAddCommand pour la connexion tracée manuellement", () => {
		const section = new Section("s1", "S");
		const contact = createContactElement("A", "NO", 0, 0);
		const coil = createCoilElement("Q1", "normal", 0, 1);
		section.elements = [contact, coil];
		const { result } = setup(section);

		result.current({ source: contact.id, target: coil.id, sourceHandle: null, targetHandle: null });

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [commands] = executeOperation.mock.calls[0];
		expect(commands).toHaveLength(1);
		const [command] = commands;
		expect(command).toBeInstanceOf(ConnectionsAddCommand);
		expect(command.payload).toMatchObject({
			sectionId: section.id,
			connections: [{ source: { id: contact.id }, target: { id: coil.id } }],
		});
	});

	it("matérialise une borne d'alimentation réelle quand la source est une ligne virtuelle", () => {
		const section = new Section("s1", "S");
		const contact = createContactElement("A", "NO", 2, 0);
		section.elements = [contact];
		const { result } = setup(section);

		result.current({ source: virtualRailId(2), target: contact.id, sourceHandle: null, targetHandle: null });

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [commands] = executeOperation.mock.calls[0];
		expect(commands).toHaveLength(2);
		const [addCommand, connectCommand] = commands;
		expect(addCommand).toBeInstanceOf(ElementsAddCommand);
		expect(addCommand.payload.elements).toHaveLength(1);
		const [railTerminal] = addCommand.payload.elements;
		expect(railTerminal).toMatchObject({ type: "railTerminal", position: { row: 2 } });
		expect(connectCommand).toBeInstanceOf(ConnectionsAddCommand);
		expect(connectCommand.payload.connections[0]).toMatchObject({ source: { id: railTerminal.id }, target: { id: contact.id } });
	});
});
