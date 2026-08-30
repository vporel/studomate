import ConnectionUpdateCommand from "@/schemas/ladder/commands/connection-update.command";
import ConnectionsAddCommand from "@/schemas/ladder/commands/connections-add.command";
import ConnectionsRemoveCommand from "@/schemas/ladder/commands/connections-remove.command";
import ElementUpdateCommand from "@/schemas/ladder/commands/element-update.command";
import Connection from "@/schemas/ladder/connection.schema";
import {
	createCoilElement,
	createContactElement,
} from "@/schemas/ladder/element.schema";
import Section from "@/schemas/ladder/section.schema";
import {
	GRID_CELL_HEIGHT,
	LADDER_FLOW_TOP_OFFSET,
	POWER_RAIL_OFFSET,
} from "@/ui/utils/ladder/ladder-flow-builder";
import LadderMoveManager from "./move.manager";

const x = (col: number) => POWER_RAIL_OFFSET + col * 60;
const y = (row: number) => LADDER_FLOW_TOP_OFFSET + row * GRID_CELL_HEIGHT;

/** Frame React Flow terminale (dragging: false) déplaçant `id` vers la cellule (row, col). */
const drop = (id: string, row: number, col: number) => ({
	type: "position" as const,
	id,
	position: { x: x(col), y: y(row) },
	dragging: false,
});

function derive(
	section: Section,
	change: any,
): { edges: any[]; commands: any[] } {
	return new LadderMoveManager().derivePositionEffects(
		section,
		[change] as any,
		[],
	);
}

describe("LadderMoveManager.derivePositionEffects", () => {
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

		const { commands } = derive(section, drop(coil.id, 1, 3));

		expect(commands).toHaveLength(2);
		expect(commands[1]).toBeInstanceOf(ConnectionUpdateCommand);
		expect(commands[1].payload).toEqual({
			connectionId: "c1",
			changes: {
				points: [
					[2, 8],
					[6, 8],
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

		const { commands } = derive(section, drop(contact.id, 0, 3));

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

		const { commands } = derive(section, drop(contact.id, 0, 3));

		const updates = commands.filter(
			(c: any) => c instanceof ConnectionUpdateCommand,
		);
		expect(updates).toHaveLength(1);
		expect(updates[0].payload.connectionId).toBe("c1");
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

		const { commands } = derive(section, drop(contact.id, 2, 1));

		// pas de ConnectionUpdateCommand : les points sont laissés intacts
		expect(commands).toHaveLength(1);
	});

	it("recâble (plutôt que d'annuler) un glisser d'un seul nœud qui inverserait une connexion", () => {
		const section = new Section("s1", "S");
		const contact = createContactElement("A", "NO", 0, 1);
		const coil = createCoilElement("Q1", "normal", 0, 3);
		section.elements = [contact, coil];
		section.connections = [
			new Connection(
				"c1",
				{ id: contact.id, type: "contact", handle: "source" },
				{ id: coil.id, type: "coil", handle: "target" },
				{ points: [] },
			),
		];

		const { commands } = derive(section, drop(coil.id, 0, 0));

		// l'ancienne connexion A->Q1 est retirée
		const removed = commands.find(
			(c: any) => c instanceof ConnectionsRemoveCommand,
		) as any;
		expect(
			removed.payload.connections.map((c: any) => [c.source.id, c.target.id]),
		).toEqual([[contact.id, coil.id]]);
		// Q1 déposé en colonne 0 se rebranche au rail
		const added = commands.find(
			(c: any) => c instanceof ConnectionsAddCommand,
		) as any;
		expect(
			added.payload.connections.some((c: any) => c.target.id === coil.id),
		).toBe(true);
	});

	it("ne collecte aucune commande tant que la frame n'est pas terminale (dragging: true)", () => {
		const section = new Section("s1", "S");
		const contact = createContactElement("A", "NO", 0, 0);
		section.elements = [contact];

		const { commands } = derive(section, {
			type: "position",
			id: contact.id,
			position: { x: x(3), y: y(0) },
			dragging: true,
		});

		expect(commands).toHaveLength(0);
	});

	it("ne collecte rien si la position arrondie n'a pas changé", () => {
		const section = new Section("s1", "S");
		const contact = createContactElement("A", "NO", 1, 2);
		section.elements = [contact];

		const { commands } = derive(section, drop(contact.id, 1, 2));

		expect(commands).toHaveLength(0);
	});

	it("émet un ElementUpdateCommand avec row/col arrondis pour un simple déplacement", () => {
		const section = new Section("s1", "S");
		const contact = createContactElement("A", "NO", 0, 0);
		section.elements = [contact];

		const { commands } = derive(section, drop(contact.id, 1, 2));

		expect(commands).toHaveLength(1);
		expect(commands[0]).toBeInstanceOf(ElementUpdateCommand);
		expect(commands[0].payload).toEqual({
			elementId: contact.id,
			changes: { position: { row: 1, col: 2 } },
			previousChanges: { position: { row: 0, col: 0 } },
		});
	});
});
