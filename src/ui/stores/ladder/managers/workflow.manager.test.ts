import ConnectionsAddCommand from "@/schemas/ladder/commands/connections-add.command";
import ConnectionsRemoveCommand from "@/schemas/ladder/commands/connections-remove.command";
import ElementUpdateCommand from "@/schemas/ladder/commands/element-update.command";
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
			selectedSectionIds: [] as string[],
			activeSectionId: null as string | null,
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

	it("efface la sélection des autres sections quand un nœud est sélectionné (sélection globale)", () => {
		const s1 = new Section("s1", "S1");
		s1.elements = [createContactElement("A", "NO", 0, 0)];
		const s2 = new Section("s2", "S2");
		s2.elements = [createContactElement("B", "NO", 0, 0)];
		const ladder = new Ladder("l1", "L", [s1, s2]);

		let state: any = {
			ladder,
			nodesBySectionId: {
				s1: LadderNodesFactory.getInitialNodes(s1).map((n) => ({
					...n,
					selected: true,
				})),
				s2: LadderNodesFactory.getInitialNodes(s2),
			},
			edgesBySectionId: {
				s1: [{ id: "e1", selected: true } as any],
				s2: [],
			},
			commandsStackManager: commandsStackManager as any,
		};
		const setStoreState = jest.fn((partial: any) => {
			state = {
				...state,
				...(typeof partial === "function" ? partial(state) : partial),
			};
		});
		const workflowManager = new LadderWorkflowManager(
			setStoreState as any,
			(() => state) as any,
		);

		workflowManager.handleNodesChange("s2", [
			{ type: "select", id: s2.elements[0].id, selected: true } as any,
		]);

		expect(state.nodesBySectionId.s1.every((n: any) => !n.selected)).toBe(true);
		expect(state.edgesBySectionId.s1.every((e: any) => !e.selected)).toBe(true);
		expect(
			state.nodesBySectionId.s2.find((n: any) => n.id === s2.elements[0].id)!
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

	describe("moveSelectedElementsByCells (déplacement au clavier)", () => {
		it("dispatche un ElementUpdateCommand d'une cellule pour le nœud sélectionné", () => {
			const section = new Section("s1", "S");
			const contact = createContactElement("A", "NO", 1, 2);
			section.elements = [contact];
			const { workflowManager } = setup(section);
			workflowManager.handleNodesChange(section.id, [
				{ type: "select", id: contact.id, selected: true } as any,
			]);
			executeOperation.mockClear();

			workflowManager.moveSelectedElementsByCells(section.id, 0, 1);

			expect(executeOperation).toHaveBeenCalledTimes(1);
			const [commands] = executeOperation.mock.calls[0];
			expect(commands[0]).toBeInstanceOf(ElementUpdateCommand);
			expect(commands[0].payload.changes.position).toEqual({ row: 1, col: 3 });
		});

		it("ne fait rien sans sélection", () => {
			const section = new Section("s1", "S");
			section.elements = [createContactElement("A", "NO", 0, 0)];
			const { workflowManager } = setup(section);

			workflowManager.moveSelectedElementsByCells(section.id, 0, 1);

			expect(executeOperation).not.toHaveBeenCalled();
		});
	});

	describe("contrainte d'occupation de la grille", () => {
		const x = (col: number) => POWER_RAIL_OFFSET + col * 60;
		const y = (row: number) => LADDER_FLOW_TOP_OFFSET + row * GRID_CELL_HEIGHT;
		const posOf = (state: any, id: string) =>
			state.nodesBySectionId["s1"].find((n: any) => n.id === id)!.position;

		it("ne gèle pas une frame intermédiaire d'un seul nœud survolant une cellule occupée (suit le curseur pour pouvoir glisser au-delà)", () => {
			const section = new Section("s1", "S");
			const moved = createContactElement("A", "NO", 0, 0);
			const obstacle = createContactElement("B", "NO", 0, 3);
			section.elements = [moved, obstacle];
			const { workflowManager, getState } = setup(section);

			workflowManager.handleNodesChange(section.id, [
				{
					type: "position",
					id: moved.id,
					position: { x: x(3), y: y(0) },
					dragging: true,
				} as any,
			]);

			expect(posOf(getState(), moved.id)).toEqual({ x: x(3), y: y(0) });
			expect(executeOperation).not.toHaveBeenCalled();
		});

		it("laisse passer une frame intermédiaire vers une cellule libre", () => {
			const section = new Section("s1", "S");
			const moved = createContactElement("A", "NO", 0, 0);
			section.elements = [moved];
			const { workflowManager, getState } = setup(section);

			workflowManager.handleNodesChange(section.id, [
				{
					type: "position",
					id: moved.id,
					position: { x: x(4), y: y(0) },
					dragging: true,
				} as any,
			]);

			expect(posOf(getState(), moved.id)).toEqual({ x: x(4), y: y(0) });
		});

		it("pose le nœud sur sa dernière cellule libre si le lâcher vise une cellule occupée", () => {
			const section = new Section("s1", "S");
			const moved = createContactElement("A", "NO", 0, 0);
			const obstacle = createContactElement("B", "NO", 0, 1);
			section.elements = [moved, obstacle];
			const { workflowManager } = setup(section);

			// frame intermédiaire vers une cellule libre : le nœud y est rendu
			workflowManager.handleNodesChange(section.id, [
				{
					type: "position",
					id: moved.id,
					position: { x: x(5), y: y(0) },
					dragging: true,
				} as any,
			]);
			// lâcher sur la cellule occupée par l'obstacle
			workflowManager.handleNodesChange(section.id, [
				{
					type: "position",
					id: moved.id,
					position: { x: x(1), y: y(0) },
					dragging: false,
				} as any,
			]);

			expect(executeOperation).toHaveBeenCalledTimes(1);
			const [commands] = executeOperation.mock.calls[0];
			expect(commands[0].payload.changes.position).toEqual({ row: 0, col: 5 });
		});

		it("gèle tout le lot d'un déplacement multiple si un membre entre en collision", () => {
			const section = new Section("s1", "S");
			const a = createContactElement("A", "NO", 0, 0);
			const b = createContactElement("B", "NO", 0, 1);
			const obstacle = createContactElement("C", "NO", 0, 5);
			section.elements = [a, b, obstacle];
			const { workflowManager, getState } = setup(section);

			workflowManager.handleNodesChange(section.id, [
				{
					type: "position",
					id: a.id,
					position: { x: x(4), y: y(0) },
					dragging: true,
				} as any,
				{
					type: "position",
					id: b.id,
					position: { x: x(5), y: y(0) },
					dragging: true,
				} as any,
			]);

			expect(posOf(getState(), a.id)).toEqual({ x: x(0), y: y(0) });
			expect(posOf(getState(), b.id)).toEqual({ x: x(1), y: y(0) });
		});

		it("recâble un élément connecté déplacé de l'autre côté de son voisin (cicatrise + redépose)", () => {
			const section = new Section("s1", "S");
			const x0 = createContactElement("X0", "NF", 0, 0);
			const x1 = createContactElement("X1", "NF", 0, 3);
			const x2 = createContactElement("X2", "NF", 0, 6);
			section.elements = [x0, x1, x2];
			section.connections = [
				new Connection(
					"c0",
					{ id: x0.id, type: "contact", handle: "source" },
					{ id: x1.id, type: "contact", handle: "target" },
					{ points: [] },
				),
				new Connection(
					"c1",
					{ id: x1.id, type: "contact", handle: "source" },
					{ id: x2.id, type: "contact", handle: "target" },
					{ points: [] },
				),
			];
			const { workflowManager } = setup(section);

			workflowManager.handleNodesChange(section.id, [
				{
					type: "position",
					id: x1.id,
					position: { x: x(8), y: y(0) },
					dragging: false,
				} as any,
			]);

			expect(executeOperation).toHaveBeenCalledTimes(1);
			const [commands] = executeOperation.mock.calls[0];
			const update = commands.find(
				(c: any) => c instanceof ElementUpdateCommand,
			);
			expect(update.payload.changes.position).toEqual({ row: 0, col: 8 });

			const removed = commands.find(
				(c: any) => c instanceof ConnectionsRemoveCommand,
			);
			const removedPairs = removed.payload.connections.map((c: any) => [
				c.source.id,
				c.target.id,
			]);
			expect(removedPairs).toEqual(
				expect.arrayContaining([
					[x0.id, x1.id],
					[x1.id, x2.id],
				]),
			);

			const added = commands.find(
				(c: any) => c instanceof ConnectionsAddCommand,
			);
			const addedPairs = added.payload.connections.map((c: any) => [
				c.source.id,
				c.target.id,
			]);
			// cicatrisation X0->X2 et redépôt en série derrière X2
			expect(addedPairs).toEqual(
				expect.arrayContaining([
					[x0.id, x2.id],
					[x2.id, x1.id],
				]),
			);
		});

		it("laisse glisser un nœud connecté par-dessus son voisin adjacent puis recâble au lâcher", () => {
			const section = new Section("s1", "S");
			const x1 = createContactElement("X1", "NF", 0, 2);
			const x2 = createContactElement("X2", "NF", 0, 3);
			section.elements = [x1, x2];
			section.connections = [
				new Connection(
					"c1",
					{ id: x1.id, type: "contact", handle: "source" },
					{ id: x2.id, type: "contact", handle: "target" },
					{ points: [] },
				),
			];
			const { workflowManager, getState } = setup(section);

			// frame intermédiaire survolant exactement la cellule de X2 : X1 suit le curseur
			workflowManager.handleNodesChange(section.id, [
				{
					type: "position",
					id: x1.id,
					position: { x: x(3), y: y(0) },
					dragging: true,
				} as any,
			]);
			expect(posOf(getState(), x1.id)).toEqual({ x: x(3), y: y(0) });
			expect(executeOperation).not.toHaveBeenCalled();

			// lâcher au-delà de X2 : recâblage
			workflowManager.handleNodesChange(section.id, [
				{
					type: "position",
					id: x1.id,
					position: { x: x(5), y: y(0) },
					dragging: false,
				} as any,
			]);

			expect(executeOperation).toHaveBeenCalledTimes(1);
			const [commands] = executeOperation.mock.calls[0];
			const added = commands.find(
				(c: any) => c instanceof ConnectionsAddCommand,
			);
			const addedPairs = added.payload.connections.map((c: any) => [
				c.source.id,
				c.target.id,
			]);
			expect(addedPairs).toEqual(expect.arrayContaining([[x2.id, x1.id]]));
		});

		it("épisse un élément déconnecté lâché sur un fil existant (X0→X2 devient X0→X1→X2)", () => {
			const section = new Section("s1", "S");
			const x0 = createContactElement("X0", "NF", 0, 0);
			const x2 = createContactElement("X2", "NF", 0, 8);
			const x1 = createContactElement("X1", "NF", 0, 12);
			section.elements = [x0, x2, x1];
			section.connections = [
				new Connection(
					"c",
					{ id: x0.id, type: "contact", handle: "source" },
					{ id: x2.id, type: "contact", handle: "target" },
					{ points: [] },
				),
			];
			const { workflowManager } = setup(section);

			workflowManager.handleNodesChange(section.id, [
				{
					type: "position",
					id: x1.id,
					position: { x: x(4), y: y(0) },
					dragging: false,
				} as any,
			]);

			expect(executeOperation).toHaveBeenCalledTimes(1);
			const [commands] = executeOperation.mock.calls[0];
			const added = commands
				.find((c: any) => c instanceof ConnectionsAddCommand)
				.payload.connections.map((c: any) => [c.source.id, c.target.id]);
			expect(added).toEqual(
				expect.arrayContaining([
					[x0.id, x1.id],
					[x1.id, x2.id],
				]),
			);
			const removed = commands
				.find((c: any) => c instanceof ConnectionsRemoveCommand)
				.payload.connections.map((c: any) => c.id);
			expect(removed).toEqual(["c"]);
		});

		it("recâble un élément adjacent à son voisin même quand la cicatrisation réutilise le rail", () => {
			const section = new Section("s1", "S");
			const rail = createRailTerminalElement(0);
			const x1 = createContactElement("X1", "NF", 0, 2);
			const x2 = createContactElement("X2", "NF", 0, 3);
			section.elements = [rail, x1, x2];
			section.connections = [
				new Connection(
					"c0",
					{ id: rail.id, type: "railTerminal", handle: "source" },
					{ id: x1.id, type: "contact", handle: "target" },
					{ points: [] },
				),
				new Connection(
					"c1",
					{ id: x1.id, type: "contact", handle: "source" },
					{ id: x2.id, type: "contact", handle: "target" },
					{ points: [] },
				),
			];
			const { workflowManager } = setup(section);

			workflowManager.handleNodesChange(section.id, [
				{
					type: "position",
					id: x1.id,
					position: { x: x(6), y: y(0) },
					dragging: false,
				} as any,
			]);

			expect(executeOperation).toHaveBeenCalledTimes(1);
			const commands = executeOperation.mock.calls[0][0];
			// l'opération est valide (aucune commande annulée) : rail conservé pour rail->X2
			const added = commands.find(
				(c: any) => c instanceof ConnectionsAddCommand,
			);
			const addedPairs = added.payload.connections.map((c: any) => [
				c.source.id,
				c.target.id,
			]);
			expect(addedPairs).toEqual(
				expect.arrayContaining([
					[rail.id, x2.id],
					[x2.id, x1.id],
				]),
			);
			// et l'ordre place l'ajout avant le retrait
			const addIndex = commands.findIndex(
				(c: any) => c instanceof ConnectionsAddCommand,
			);
			const removeIndex = commands.findIndex(
				(c: any) => c instanceof ConnectionsRemoveCommand,
			);
			expect(addIndex).toBeLessThan(removeIndex);
		});

		it("ne recâble pas un déplacement multiple qui inverserait une connexion (gel)", () => {
			const section = new Section("s1", "S");
			const x0 = createContactElement("X0", "NF", 0, 0);
			const x1 = createContactElement("X1", "NF", 0, 3);
			const x2 = createContactElement("X2", "NF", 0, 6);
			const other = createContactElement("Y", "NF", 2, 0);
			section.elements = [x0, x1, x2, other];
			section.connections = [
				new Connection(
					"c1",
					{ id: x1.id, type: "contact", handle: "source" },
					{ id: x2.id, type: "contact", handle: "target" },
					{ points: [] },
				),
			];
			const { workflowManager, getState } = setup(section);

			workflowManager.handleNodesChange(section.id, [
				{
					type: "position",
					id: x1.id,
					position: { x: x(8), y: y(0) },
					dragging: false,
				} as any,
				{
					type: "position",
					id: other.id,
					position: { x: x(1), y: y(2) },
					dragging: false,
				} as any,
			]);

			expect(
				executeOperation.mock.calls.flatMap(([cmds]: any) => cmds).some(
					(c: any) => c instanceof ConnectionsRemoveCommand,
				),
			).toBe(false);
			expect(posOf(getState(), x1.id)).toEqual({ x: x(3), y: y(0) });
		});

		it("laisse déplacer un élément connecté vers une cellule libre entre ses voisins", () => {
			const section = new Section("s1", "S");
			const x0 = createContactElement("X0", "NF", 0, 0);
			const x1 = createContactElement("X1", "NF", 0, 1);
			const x2 = createContactElement("X2", "NF", 0, 4);
			section.elements = [x0, x1, x2];
			section.connections = [
				new Connection(
					"c1",
					{ id: x1.id, type: "contact", handle: "source" },
					{ id: x2.id, type: "contact", handle: "target" },
					{ points: [] },
				),
			];
			const { workflowManager } = setup(section);

			workflowManager.handleNodesChange(section.id, [
				{
					type: "position",
					id: x1.id,
					position: { x: x(3), y: y(0) },
					dragging: false,
				} as any,
			]);

			expect(executeOperation).toHaveBeenCalledTimes(1);
			const [commands] = executeOperation.mock.calls[0];
			expect(commands[0].payload.changes.position).toEqual({ row: 0, col: 3 });
		});

		it("un pas clavier vers une cellule occupée laisse le nœud sur place", () => {
			const section = new Section("s1", "S");
			const moved = createContactElement("A", "NO", 0, 0);
			const obstacle = createContactElement("B", "NO", 0, 1);
			section.elements = [moved, obstacle];
			const { workflowManager, getState } = setup(section);

			workflowManager.handleNodesChange(section.id, [
				{
					type: "position",
					id: moved.id,
					position: { x: x(1), y: y(0) },
					dragging: false,
				} as any,
			]);

			expect(executeOperation).not.toHaveBeenCalled();
			expect(posOf(getState(), moved.id)).toEqual({ x: x(0), y: y(0) });
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
