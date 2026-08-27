import ConnectionUpdateCommand from "@/schemas/ladder/commands/connection-update.command";
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
import {
	GRID_CELL_HEIGHT,
	LADDER_FLOW_TOP_OFFSET,
	POWER_RAIL_OFFSET,
	virtualRailId,
} from "@/ui/utils/ladder/ladder-flow-builder";
import LadderNodesFactory from "../factories/nodes.factory";
import LadderWorkflowManager from "./workflow.manager";

describe("LadderWorkflowManager", () => {
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
			commandsStackManager: commandsStackManager as any,
		};
		const setStoreState = jest.fn((partial: any) => {
			state = {
				...state,
				...(typeof partial === "function" ? partial(state) : partial),
			};
		});
		const getStoreState = jest.fn(() => state as any);
		const workflowManager = new LadderWorkflowManager(
			setStoreState as any,
			getStoreState as any,
		);
		return { workflowManager, getState: () => state };
	}

	it("patche nodesBySectionId via applyNodeChanges (retour visuel en direct)", () => {
		const section = new Section("s1", "S");
		const contact = createContactElement("A", "NO", 0, 0);
		section.elements = [contact];
		const { workflowManager, getState } = setup(section);

		workflowManager.handleNodesChange(section.id, [
			{ type: "select", id: contact.id, selected: true } as any,
		]);

		expect(
			getState().nodesBySectionId[section.id].find((n) => n.id === contact.id)!
				.selected,
		).toBe(true);
	});

	it("ne dispatche pas de commande pour une frame de glisser intermédiaire (dragging: true)", () => {
		const section = new Section("s1", "S");
		const contact = createContactElement("A", "NO", 0, 0);
		section.elements = [contact];
		const { workflowManager } = setup(section);

		workflowManager.handleNodesChange(section.id, [
			{
				type: "position",
				id: contact.id,
				position: { x: 999, y: 999 },
				dragging: true,
			} as any,
		]);

		expect(executeOperation).not.toHaveBeenCalled();
	});

	it("dispatche ElementUpdateCommand à la fin du geste (dragging: false), avec row/col arrondis", () => {
		const section = new Section("s1", "S");
		const contact = createContactElement("A", "NO", 0, 0);
		section.elements = [contact];
		const { workflowManager } = setup(section);
		const newX = POWER_RAIL_OFFSET + 2 * 60;
		const newY = LADDER_FLOW_TOP_OFFSET + 1 * GRID_CELL_HEIGHT;

		workflowManager.handleNodesChange(section.id, [
			{
				type: "position",
				id: contact.id,
				position: { x: newX, y: newY },
				dragging: false,
			} as any,
		]);

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [commands] = executeOperation.mock.calls[0];
		expect(commands).toHaveLength(1);
		expect(commands[0]).toBeInstanceOf(ElementUpdateCommand);
		expect(commands[0].payload).toEqual({
			elementId: contact.id,
			changes: { position: { row: 1, col: 2 } },
			previousChanges: { position: { row: 0, col: 0 } },
		});
	});

	it("ignore une borne d'alimentation virtuelle (jamais persistée)", () => {
		const section = new Section("s1", "S");
		const { workflowManager } = setup(section);

		workflowManager.handleNodesChange(section.id, [
			{
				type: "position",
				id: virtualRailId(0),
				position: { x: 0, y: 0 },
				dragging: false,
			} as any,
		]);

		expect(executeOperation).not.toHaveBeenCalled();
	});

	it("ne dispatche rien si la position arrondie n'a pas changé", () => {
		const section = new Section("s1", "S");
		const contact = createContactElement("A", "NO", 1, 2);
		section.elements = [contact];
		const { workflowManager } = setup(section);

		workflowManager.handleNodesChange(section.id, [
			{
				type: "position",
				id: contact.id,
				position: {
					x: POWER_RAIL_OFFSET + 2 * 60,
					y: LADDER_FLOW_TOP_OFFSET + 1 * GRID_CELL_HEIGHT,
				},
				dragging: false,
			} as any,
		]);

		expect(executeOperation).not.toHaveBeenCalled();
	});

	it("filtre les changements 'remove' (gérés exclusivement par useLadderDeleteHandler)", () => {
		const section = new Section("s1", "S");
		const railTerminal = createRailTerminalElement(0);
		const contact = createContactElement("A", "NO", 0, 0);
		section.elements = [railTerminal, contact];
		const { workflowManager, getState } = setup(section);
		const before = getState().nodesBySectionId[section.id];

		workflowManager.handleNodesChange(section.id, [
			{ type: "remove", id: contact.id } as any,
		]);

		expect(getState().nodesBySectionId[section.id]).toEqual(before);
		expect(executeOperation).not.toHaveBeenCalled();
	});

	it("matérialise le coude d'une connexion même-ligne quand le déplacement fait diverger les lignes", () => {
		const section = new Section("s1", "S");
		const contact = createContactElement("A", "NO", 0, 0);
		const coil = createCoilElement("Q1", "normal", 0, 3);
		section.elements = [contact, coil];
		section.connections = [
			new Connection(
				"c1",
				{ id: contact.id, type: "contact", handle: "source" },
				{ id: coil.id, type: "coil", handle: "target" },
			),
		];
		const { workflowManager } = setup(section);

		workflowManager.handleNodesChange(section.id, [
			{
				type: "position",
				id: coil.id,
				position: {
					x: POWER_RAIL_OFFSET + 3 * 60,
					y: LADDER_FLOW_TOP_OFFSET + 1 * GRID_CELL_HEIGHT,
				},
				dragging: false,
			} as any,
		]);

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [commands] = executeOperation.mock.calls[0];
		expect(commands).toHaveLength(2);
		expect(commands[1]).toBeInstanceOf(ConnectionUpdateCommand);
		expect(commands[1].payload).toEqual({
			connectionId: "c1",
			changes: {
				points: [
					[2, 4],
					[6, 4],
				],
			},
			previousChanges: { points: [] },
		});
	});

	it("pousse le coude d'une connexion déjà matérialisée quand le nœud déplacé le rattrape", () => {
		const section = new Section("s1", "S");
		const contact = createContactElement("A", "NO", 0, 1);
		const coil = createCoilElement("Q1", "normal", 2, 3);
		section.elements = [contact, coil];
		section.connections = [
			new Connection(
				"c1",
				{ id: contact.id, type: "contact", handle: "source" },
				{ id: coil.id, type: "coil", handle: "target" },
				{
					points: [
						[2, 8],
						[10, 8],
					],
				},
			),
		];
		const { workflowManager } = setup(section);

		workflowManager.handleNodesChange(section.id, [
			{
				type: "position",
				id: contact.id,
				position: {
					x: POWER_RAIL_OFFSET + 3 * 60,
					y: LADDER_FLOW_TOP_OFFSET + 0 * GRID_CELL_HEIGHT,
				},
				dragging: false,
			} as any,
		]);

		const [commands] = executeOperation.mock.calls[0];
		expect(commands).toHaveLength(2);
		expect(commands[1].payload.changes).toEqual({
			points: [
				[2, 16],
				[10, 16],
			],
		});
	});

	it("ne touche jamais une connexion qui ne concerne pas le nœud déplacé", () => {
		const section = new Section("s1", "S");
		const contact = createContactElement("A", "NO", 0, 1);
		const coil = createCoilElement("Q1", "normal", 2, 3);
		const otherContact = createContactElement("B", "NO", 5, 0);
		const otherCoil = createCoilElement("Q2", "normal", 6, 2);
		section.elements = [contact, coil, otherContact, otherCoil];
		const untouchedPoints: [number, number][] = [
			[22, 4],
			[26, 4],
		];
		section.connections = [
			new Connection(
				"c1",
				{ id: contact.id, type: "contact", handle: "source" },
				{ id: coil.id, type: "coil", handle: "target" },
				{
					points: [
						[2, 8],
						[10, 8],
					],
				},
			),
			new Connection(
				"c2",
				{ id: otherContact.id, type: "contact", handle: "source" },
				{ id: otherCoil.id, type: "coil", handle: "target" },
				{ points: untouchedPoints },
			),
		];
		const { workflowManager } = setup(section);

		workflowManager.handleNodesChange(section.id, [
			{
				type: "position",
				id: contact.id,
				position: {
					x: POWER_RAIL_OFFSET + 3 * 60,
					y: LADDER_FLOW_TOP_OFFSET + 0 * GRID_CELL_HEIGHT,
				},
				dragging: false,
			} as any,
		]);

		const [commands] = executeOperation.mock.calls[0];
		expect(
			commands.filter((c: any) => c instanceof ConnectionUpdateCommand),
		).toHaveLength(1);
		expect(
			commands.find((c: any) => c instanceof ConnectionUpdateCommand).payload
				.connectionId,
		).toBe("c1");
		expect(section.connections[1].data.points).toEqual(untouchedPoints);
	});

	it("conserve la mémoire du coude quand le déplacement réaligne les deux nœuds sur la même ligne", () => {
		const section = new Section("s1", "S");
		const contact = createContactElement("A", "NO", 0, 1);
		const coil = createCoilElement("Q1", "normal", 2, 3);
		section.elements = [contact, coil];
		section.connections = [
			new Connection(
				"c1",
				{ id: contact.id, type: "contact", handle: "source" },
				{ id: coil.id, type: "coil", handle: "target" },
				{
					points: [
						[2, 8],
						[10, 8],
					],
				},
			),
		];
		const { workflowManager } = setup(section);

		workflowManager.handleNodesChange(section.id, [
			{
				type: "position",
				id: contact.id,
				position: {
					x: POWER_RAIL_OFFSET + 1 * 60,
					y: LADDER_FLOW_TOP_OFFSET + 2 * GRID_CELL_HEIGHT,
				},
				dragging: false,
			} as any,
		]);

		const [commands] = executeOperation.mock.calls[0];
		expect(commands).toHaveLength(1); // pas de ConnectionUpdateCommand : les points sont laissés intacts
	});

	it("refuse un glisser qui inverserait l'ordre colonne d'une connexion existante (revient à la position d'origine)", () => {
		const section = new Section("s1", "S");
		const contact = createContactElement("A", "NO", 0, 1);
		const coil = createCoilElement("Q1", "normal", 0, 3);
		section.elements = [contact, coil];
		section.connections = [
			new Connection(
				"c1",
				{ id: contact.id, type: "contact", handle: "source" },
				{ id: coil.id, type: "coil", handle: "target" },
				{
					points: [],
				},
			),
		];
		const { workflowManager, getState } = setup(section);

		workflowManager.handleNodesChange(section.id, [
			{
				type: "position",
				id: coil.id,
				position: {
					x: POWER_RAIL_OFFSET + 0 * 60,
					y: LADDER_FLOW_TOP_OFFSET + 0 * GRID_CELL_HEIGHT,
				},
				dragging: false,
			} as any,
		]);

		expect(executeOperation).not.toHaveBeenCalled();
		const coilNode = getState().nodesBySectionId[section.id].find(
			(n: any) => n.id === coil.id,
		)!;
		expect(coilNode.position).toEqual({
			x: POWER_RAIL_OFFSET + 3 * 60,
			y: LADDER_FLOW_TOP_OFFSET + 0 * GRID_CELL_HEIGHT,
		});
	});

	it("patche edgesBySectionId via applyEdgeChanges", () => {
		const section = new Section("s1", "S");
		const { workflowManager, getState } = setup(section);
		const edge = {
			id: "e1",
			source: "n1",
			target: "n2",
			selected: false,
		} as any;
		getState().edgesBySectionId[section.id].push(edge);

		workflowManager.handleEdgesChange(section.id, [
			{ type: "select", id: "e1", selected: true } as any,
		]);

		expect(
			getState().edgesBySectionId[section.id].find((e) => e.id === "e1")!
				.selected,
		).toBe(true);
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
			const { workflowManager } = setup(section);

			workflowManager.deleteElements(section.id, [contact.id]);

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
			const { workflowManager } = setup(section);

			workflowManager.deleteElements(section.id, ["virtual-rail-0"]);

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
			const { workflowManager } = setup(section);

			workflowManager.deleteElements(section.id, [], ["c1"]);

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
			const { workflowManager } = setup(section);

			workflowManager.deleteElements(section.id, [], []);

			expect(executeOperation).not.toHaveBeenCalled();
		});

		it("ne fait rien pour une section inconnue", () => {
			const section = new Section("s1", "S");
			const { workflowManager } = setup(section);

			workflowManager.deleteElements("unknown-section", ["some-id"]);

			expect(executeOperation).not.toHaveBeenCalled();
		});
	});

	describe("adoptLadder", () => {
		it("préserve l'identité des nœuds non touchés par le nouveau ladder", () => {
			const section = new Section("s1", "S");
			const contact = createContactElement("A", "NO", 0, 0);
			const coil = createCoilElement("Q1", "normal", 0, 1);
			section.elements = [contact, coil];
			const { workflowManager, getState } = setup(section);
			const contactNodeBefore = getState().nodesBySectionId[section.id].find(
				(n) => n.id === contact.id,
			)!;

			const adopted = getState().ladder.copy();
			const adoptedContact = adopted.sections[0].elements.find(
				(e) => e.id === coil.id,
			)!;
			(adoptedContact.data as any).variable = "Q2";
			workflowManager.adoptLadder(adopted);

			const contactNodeAfter = getState().nodesBySectionId[section.id].find(
				(n) => n.id === contact.id,
			)!;
			expect(contactNodeAfter).toBe(contactNodeBefore);
			expect(getState().ladder).toBe(adopted);
		});
	});
});
