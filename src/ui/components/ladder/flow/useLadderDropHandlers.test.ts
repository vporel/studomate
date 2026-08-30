/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { useReactFlow } from "@xyflow/react";
import Section from "@/schemas/ladder/section.schema";
import ElementsAddCommand from "@/schemas/ladder/commands/elements-add.command";
import ConnectionsAddCommand from "@/schemas/ladder/commands/connections-add.command";
import ElementUpdateCommand from "@/schemas/ladder/commands/element-update.command";
import ConnectionsRemoveCommand from "@/schemas/ladder/commands/connections-remove.command";
import Connection from "@/schemas/ladder/connection.schema";
import { createUserProgramBlockElement } from "@/schemas/ladder/block.schema";
import { createTimerBlockElement } from "@/schemas/ladder/function-blocks/timer.schema";
import {
	createContactElement,
	createCoilElement,
} from "@/schemas/ladder/element.schema";
import { useLadderStore } from "../context/LadderContext";
import { useLadderToolbarDnD } from "../toolbar/LadderToolbarDnDContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import useLadderDropHandlers from "./useLadderDropHandlers";
import {
	colToX,
	GRID_CELL_HEIGHT,
	GRID_CELL_WIDTH,
	rowToY,
} from "@/ui/utils/ladder/ladder-flow-builder";
import { LADDER_PROGRAM_DRAG_MIME_TYPE } from "@/ui/utils/ladder/ladder-program-drag";

jest.mock("../context/LadderContext", () => ({
	useLadderStore: jest.fn(),
}));
jest.mock("../toolbar/LadderToolbarDnDContext", () => ({
	useLadderToolbarDnD: jest.fn(),
}));
jest.mock("@xyflow/react", () => ({
	useReactFlow: jest.fn(),
}));

function fakeDragEvent(clientX: number, clientY: number) {
	return {
		preventDefault: jest.fn(),
		dataTransfer: { dropEffect: "", getData: () => "", types: [] as string[] },
		// screenToFlowPosition attend clientX/clientY (coordonnées viewport) — pageX/pageY
		// (coordonnées document, sensibles au défilement de la page) donnaient un mauvais calcul
		// de cellule au lâcher. On fixe volontairement pageX/pageY à des valeurs différentes pour
		// s'assurer qu'un retour accidentel à pageX/pageY ferait échouer les tests de position.
		clientX,
		clientY,
		pageX: clientX + 1000,
		pageY: clientY + 1000,
	} as any;
}

/** Dépose d'un programme glissé depuis le menu de l'explorateur (voir `LADDER_PROGRAM_DRAG_MIME_TYPE`). */
function fakeProgramDragEvent(
	clientX: number,
	clientY: number,
	programId: string,
) {
	const event = fakeDragEvent(clientX, clientY);
	event.dataTransfer.getData = (type: string) =>
		type === LADDER_PROGRAM_DRAG_MIME_TYPE ? programId : "";
	event.dataTransfer.types = [LADDER_PROGRAM_DRAG_MIME_TYPE];
	return event;
}

describe("useLadderDropHandlers", () => {
	const executeOperation = jest.fn();
	const commandsStackManager = { executeOperation };
	// screenToFlowPosition renvoie directement les coordonnées pixel, comme dans
	// useToolDragOverHandlers.test.ts : le calcul de grille est ce qu'on teste ici, pas la
	// projection écran → flow elle-même.
	const screenToFlowPosition = jest.fn(({ x, y }) => ({ x, y }));

	afterEach(() => jest.clearAllMocks());

	function setup(
		section: Section,
		leafPositions: { id: string; row: number; col: number }[],
		draggedElement: unknown,
	) {
		(useLadderStore as jest.Mock).mockImplementation(
			selectorImplementation({ commandsStackManager }),
		);
		(useLadderToolbarDnD as jest.Mock).mockReturnValue({ draggedElement });
		(useReactFlow as jest.Mock).mockReturnValue({ screenToFlowPosition });
		return renderHook(() => useLadderDropHandlers(section, leafPositions));
	}

	it("marque le dragover comme une copie tant qu'un élément est en cours de glisser, et prévient le comportement par défaut", () => {
		const { result } = setup(new Section("s1", "S"), [], {
			kind: "contact",
			type: "NO",
		});
		const [handleDragOver] = result.current;
		const event = fakeDragEvent(0, 0);

		act(() => handleDragOver(event));

		expect(event.preventDefault).toHaveBeenCalled();
		expect(event.dataTransfer.dropEffect).toBe("copy");
	});

	it("ne dispatche rien si aucun élément n'est en cours de glisser", () => {
		const { result } = setup(new Section("s1", "S"), [], null);
		const [, handleDrop] = result.current;

		act(() => handleDrop(fakeDragEvent(0, 0)));

		expect(executeOperation).not.toHaveBeenCalled();
	});

	it("place l'élément exactement dans la cellule visée, y compris depuis sa moitié basse/droite", () => {
		const section = new Section("s1", "S");
		const { result } = setup(section, [], { kind: "contact", type: "NO" });
		const [, handleDrop] = result.current;

		// Un point dans la moitié basse/droite de la cellule (row=2, col=1) doit rester dans
		// cette cellule, pas basculer sur la cellule diagonale suivante (row=3, col=2).
		const x = colToX(1) + GRID_CELL_WIDTH * 0.9;
		const y = rowToY(2) + GRID_CELL_HEIGHT * 0.9;

		act(() => handleDrop(fakeDragEvent(x, y)));

		// screenToFlowPosition applique par défaut le snapToGrid/snapGrid configuré sur le
		// <ReactFlow> du composant (arrondi au plus proche, pas au sol) — il faut l'en exempter
		// explicitement pour ce calcul, sinon un dépôt en fin de cellule bascule sur la cellule
		// diagonale suivante avant même notre propre Math.floor.
		expect(screenToFlowPosition).toHaveBeenCalledWith(expect.anything(), {
			snapToGrid: false,
		});

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [commands] = executeOperation.mock.calls[0];
		expect(commands).toHaveLength(1);
		const [addCommand] = commands;
		expect(addCommand).toBeInstanceOf(ElementsAddCommand);
		expect(addCommand.payload.elements[0]).toMatchObject({
			position: { row: 2, col: 1 },
			data: { variable: "", type: "NO" },
		});
	});

	it("connecte automatiquement depuis l'élément le plus proche à gauche sur la même ligne", () => {
		const section = new Section("s1", "S");
		const existing = createContactElement("A", "NO", 0, 0);
		existing.id = "existing";
		section.elements = [existing];
		const leafPositions = [{ id: "existing", row: 0, col: 0 }];
		const { result } = setup(section, leafPositions, {
			kind: "coil",
			type: "normal",
		});
		const [, handleDrop] = result.current;

		const x = colToX(2);
		const y = rowToY(0);

		act(() => handleDrop(fakeDragEvent(x, y)));

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [commands] = executeOperation.mock.calls[0];
		expect(commands).toHaveLength(2);
		const [addCommand, connectCommand] = commands;
		expect(addCommand).toBeInstanceOf(ElementsAddCommand);
		expect(connectCommand).toBeInstanceOf(ConnectionsAddCommand);
		expect(connectCommand.payload.connections[0]).toMatchObject({
			source: { id: "existing" },
			target: { id: addCommand.payload.elements[0].id },
		});
	});

	it("matérialise et connecte une borne d'alimentation si le dépôt est en colonne 0 sans rien avant", () => {
		const section = new Section("s1", "S");
		const leafPositions = [{ id: "other-row", row: 5, col: 0 }];
		const { result } = setup(section, leafPositions, {
			kind: "contact",
			type: "NO",
		});
		const [, handleDrop] = result.current;

		act(() => handleDrop(fakeDragEvent(colToX(0), rowToY(0))));

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [commands] = executeOperation.mock.calls[0];
		expect(commands).toHaveLength(2);
		const [addCommand, connectCommand] = commands;
		expect(addCommand).toBeInstanceOf(ElementsAddCommand);
		expect(addCommand.payload.elements).toHaveLength(2);
		const [railTerminal, newElement] = addCommand.payload.elements;
		expect(railTerminal).toMatchObject({
			type: "railTerminal",
			position: { row: 0 },
		});
		expect(connectCommand).toBeInstanceOf(ConnectionsAddCommand);
		expect(connectCommand.payload.connections[0]).toMatchObject({
			source: { id: railTerminal.id },
			target: { id: newElement.id },
		});
	});

	it("insère l'élément entre deux éléments déjà connectés directement sur la même ligne", () => {
		const section = new Section("s1", "S");
		const left = createContactElement("A", "NO", 0, 0);
		const right = createCoilElement("Q1", "normal", 0, 3);
		section.elements = [left, right];
		const existingConnection = new Connection(
			"c1",
			{ id: left.id, type: left.type, handle: "source" },
			{ id: right.id, type: right.type, handle: "target" },
		);
		section.connections = [existingConnection];
		const leafPositions = [
			{ id: left.id, row: 0, col: 0 },
			{ id: right.id, row: 0, col: 3 },
		];
		const { result } = setup(section, leafPositions, {
			kind: "contact",
			type: "NF",
		});
		const [, handleDrop] = result.current;

		act(() => handleDrop(fakeDragEvent(colToX(1), rowToY(0))));

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [commands] = executeOperation.mock.calls[0];
		expect(commands).toHaveLength(3);
		const [addCommand, connectCommand, removeCommand] = commands;
		expect(addCommand).toBeInstanceOf(ElementsAddCommand);
		const newElementId = addCommand.payload.elements[0].id;
		expect(connectCommand).toBeInstanceOf(ConnectionsAddCommand);
		expect(connectCommand.payload.connections).toMatchObject([
			{ source: { id: left.id }, target: { id: newElementId } },
			{ source: { id: newElementId }, target: { id: right.id } },
		]);
		// Même ligne des deux côtés : aucun coude à matérialiser.
		expect(connectCommand.payload.connections[0].data.points).toEqual([]);
		expect(connectCommand.payload.connections[1].data.points).toEqual([]);
		expect(removeCommand).toBeInstanceOf(ConnectionsRemoveCommand);
		expect(removeCommand.payload.connections).toEqual([existingConnection]);
	});

	it("branchement parallèle vers la source quand un segment vertical longe la cellule par la gauche", () => {
		const section = new Section("s1", "S");
		const source = createContactElement("A", "NO", 0, 0);
		const target = createCoilElement("Q1", "normal", 3, 2);
		section.elements = [source, target];
		const connection = new Connection(
			"c1",
			{ id: source.id, type: source.type, handle: "source" },
			{ id: target.id, type: target.type, handle: "target" },
		);
		section.connections = [connection];
		const leafPositions = [
			{ id: source.id, row: 0, col: 0 },
			{ id: target.id, row: 3, col: 2 },
		];
		const { result } = setup(section, leafPositions, {
			kind: "contact",
			type: "NO",
		});
		const [, handleDrop] = result.current;

		// Cellule (1,1) : le segment vertical de la connexion (sortie de la colonne 0) longe son
		// bord gauche — voir ladder-connection-path.test.ts.
		act(() => handleDrop(fakeDragEvent(colToX(1), rowToY(1))));

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [commands] = executeOperation.mock.calls[0];
		expect(commands).toHaveLength(2);
		const [addCommand, connectCommand] = commands;
		expect(connectCommand).toBeInstanceOf(ConnectionsAddCommand);
		expect(connectCommand.payload.connections).toMatchObject([
			{
				source: { id: source.id },
				target: { id: addCommand.payload.elements[0].id },
			},
		]);
		// Aucune suppression : la connexion existante reste intacte, ce n'est pas un split.
		expect(
			commands.find((c: any) => c instanceof ConnectionsRemoveCommand),
		).toBeUndefined();
	});

	it("branchement parallèle vers la cible quand un segment vertical longe la cellule par la droite", () => {
		const section = new Section("s1", "S");
		const source = createContactElement("A", "NO", 2, 1);
		const target = createContactElement("B", "NO", 0, 3);
		section.elements = [source, target];
		section.connections = [
			new Connection(
				"c1",
				{ id: source.id, type: source.type, handle: "source" },
				{ id: target.id, type: target.type, handle: "target" },
			),
		];
		const leafPositions = [
			{ id: source.id, row: 2, col: 1 },
			{ id: target.id, row: 0, col: 3 },
		];
		const { result } = setup(section, leafPositions, {
			kind: "contact",
			type: "NO",
		});
		const [, handleDrop] = result.current;

		// Cellule (1,1) : cible assez proche pour que le coude reste à la sortie de la colonne 1,
		// dont le segment vertical longe le bord droit de la cellule.
		act(() => handleDrop(fakeDragEvent(colToX(1), rowToY(1))));

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [commands] = executeOperation.mock.calls[0];
		const [addCommand, connectCommand] = commands;
		expect(connectCommand).toBeInstanceOf(ConnectionsAddCommand);
		expect(connectCommand.payload.connections).toMatchObject([
			{
				source: { id: addCommand.payload.elements[0].id },
				target: { id: target.id },
			},
		]);
	});

	it("une bobine ne se branche jamais comme source : rien vers la cible d'un segment à droite", () => {
		const section = new Section("s1", "S");
		const source = createContactElement("A", "NO", 2, 1);
		const target = createContactElement("B", "NO", 0, 4);
		section.elements = [source, target];
		section.connections = [
			new Connection(
				"c1",
				{ id: source.id, type: source.type, handle: "source" },
				{ id: target.id, type: target.type, handle: "target" },
			),
		];
		const leafPositions = [
			{ id: source.id, row: 2, col: 1 },
			{ id: target.id, row: 0, col: 4 },
		];
		const { result } = setup(section, leafPositions, {
			kind: "coil",
			type: "normal",
		});
		const [, handleDrop] = result.current;

		act(() => handleDrop(fakeDragEvent(colToX(1), rowToY(1))));

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [commands] = executeOperation.mock.calls[0];
		expect(commands).toHaveLength(1);
		expect(commands[0]).toBeInstanceOf(ElementsAddCommand);
	});

	it("deux branchements, un de chaque côté, quand deux connexions différentes longent la cellule", () => {
		const section = new Section("s1", "S");
		const leftSource = createContactElement("A", "NO", 0, 0);
		const leftTarget = createCoilElement("Q1", "normal", 3, 2);
		const rightSource = createContactElement("B", "NO", 2, 1);
		const rightTarget = createContactElement("C", "NO", 0, 3);
		section.elements = [leftSource, leftTarget, rightSource, rightTarget];
		const leftConnection = new Connection(
			"c-left",
			{ id: leftSource.id, type: leftSource.type, handle: "source" },
			{ id: leftTarget.id, type: leftTarget.type, handle: "target" },
		);
		const rightConnection = new Connection(
			"c-right",
			{ id: rightSource.id, type: rightSource.type, handle: "source" },
			{ id: rightTarget.id, type: rightTarget.type, handle: "target" },
		);
		section.connections = [leftConnection, rightConnection];
		const leafPositions = [
			{ id: leftSource.id, row: 0, col: 0 },
			{ id: leftTarget.id, row: 3, col: 2 },
			{ id: rightSource.id, row: 2, col: 1 },
			{ id: rightTarget.id, row: 0, col: 3 },
		];
		const { result } = setup(section, leafPositions, {
			kind: "contact",
			type: "NO",
		});
		const [, handleDrop] = result.current;

		act(() => handleDrop(fakeDragEvent(colToX(1), rowToY(1))));

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [commands] = executeOperation.mock.calls[0];
		const [addCommand, connectCommand] = commands;
		const newElementId = addCommand.payload.elements[0].id;
		expect(connectCommand.payload.connections).toMatchObject([
			{ source: { id: leftSource.id }, target: { id: newElementId } },
			{ source: { id: newElementId }, target: { id: rightTarget.id } },
		]);
		expect(
			commands.find((c: any) => c instanceof ConnectionsRemoveCommand),
		).toBeUndefined();
	});

	it("insère l'élément quand un segment horizontal inter-lignes traverse la cellule (pas seulement sur la même ligne)", () => {
		const section = new Section("s1", "S");
		const source = createContactElement("A", "NO", 0, 0);
		const target = createCoilElement("Q1", "normal", 2, 8);
		section.elements = [source, target];
		const existingConnection = new Connection(
			"c1",
			{ id: source.id, type: source.type, handle: "source" },
			{ id: target.id, type: target.type, handle: "target" },
		);
		section.connections = [existingConnection];
		const leafPositions = [
			{ id: source.id, row: 0, col: 0 },
			{ id: target.id, row: 2, col: 8 },
		];
		const { result } = setup(section, leafPositions, {
			kind: "contact",
			type: "NO",
		});
		const [, handleDrop] = result.current;

		// Coude à mi-chemin (quarterCol 20) ; le segment horizontal sur la ligne cible (2) va de
		// la colonne 5 à la colonne 8 — traverse la cellule (2,6).
		act(() => handleDrop(fakeDragEvent(colToX(6), rowToY(2))));

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [commands] = executeOperation.mock.calls[0];
		expect(commands).toHaveLength(3);
		const [addCommand, connectCommand, removeCommand] = commands;
		const newElementId = addCommand.payload.elements[0].id;
		expect(connectCommand.payload.connections).toMatchObject([
			{ source: { id: source.id }, target: { id: newElementId } },
			{ source: { id: newElementId }, target: { id: target.id } },
		]);
		// source(0,0) -> nouveau(2,6) : lignes différentes, coude sur la frontière de colonne la
		// plus proche du milieu (quarterCol 16).
		expect(connectCommand.payload.connections[0].data.points).toEqual([
			[2, 16],
			[10, 16],
		]);
		// nouveau(2,6) -> cible(2,8) : même ligne, aucun coude.
		expect(connectCommand.payload.connections[1].data.points).toEqual([]);
		expect(removeCommand).toBeInstanceOf(ConnectionsRemoveCommand);
		expect(removeCommand.payload.connections).toEqual([existingConnection]);
	});

	it("ne connecte rien si aucun élément ne précède sur la même ligne hors colonne 0", () => {
		const section = new Section("s1", "S");
		const leafPositions = [{ id: "other-row", row: 5, col: 0 }];
		const { result } = setup(section, leafPositions, {
			kind: "contact",
			type: "NO",
		});
		const [, handleDrop] = result.current;

		act(() => handleDrop(fakeDragEvent(colToX(2), rowToY(0))));

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [commands] = executeOperation.mock.calls[0];
		expect(commands).toHaveLength(1);
	});

	it("remplace le mode de l'élément déjà présent dans la cellule visée s'il est du même genre", () => {
		const section = new Section("s1", "S");
		const existing = createContactElement("A", "NO", 0, 1);
		section.elements = [existing];
		const { result } = setup(section, [], { kind: "contact", type: "NF" });
		const [, handleDrop] = result.current;

		act(() => handleDrop(fakeDragEvent(colToX(1), rowToY(0))));

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [commands] = executeOperation.mock.calls[0];
		expect(commands).toHaveLength(1);
		const [command] = commands;
		expect(command).toBeInstanceOf(ElementUpdateCommand);
		expect(command.payload).toMatchObject({
			elementId: existing.id,
			changes: { data: { type: "NF" } },
			previousChanges: { data: { type: "NO" } },
		});
	});

	it("ne dispatche rien si le mode déposé est déjà celui de l'élément présent dans la cellule", () => {
		const section = new Section("s1", "S");
		const existing = createContactElement("A", "NO", 0, 1);
		section.elements = [existing];
		const { result } = setup(section, [], { kind: "contact", type: "NO" });
		const [, handleDrop] = result.current;

		act(() => handleDrop(fakeDragEvent(colToX(1), rowToY(0))));

		expect(executeOperation).not.toHaveBeenCalled();
	});

	it("refuse le dépôt si la cellule visée contient déjà un élément d'un autre genre", () => {
		const section = new Section("s1", "S");
		const existing = createCoilElement("Q1", "normal", 0, 1);
		section.elements = [existing];
		const { result } = setup(section, [], { kind: "contact", type: "NO" });
		const [, handleDrop] = result.current;

		act(() => handleDrop(fakeDragEvent(colToX(1), rowToY(0))));

		expect(executeOperation).not.toHaveBeenCalled();
	});

	it("dépose un bloc référençant le programme glissé depuis le menu de l'explorateur", () => {
		const section = new Section("s1", "S");
		const { result } = setup(section, [], null);
		const [, handleDrop] = result.current;

		act(() => handleDrop(fakeProgramDragEvent(colToX(1), rowToY(0), "prog1")));

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [commands] = executeOperation.mock.calls[0];
		const [addCommand] = commands;
		expect(addCommand).toBeInstanceOf(ElementsAddCommand);
		expect(addCommand.payload.elements[0]).toMatchObject({
			type: "block",
			position: { row: 0, col: 1 },
			data: { blockType: "user-program", params: { programId: "prog1" } },
		});
	});

	it("marque le dragover comme une copie pour un programme glissé depuis l'explorateur, même sans outil de toolbar actif", () => {
		const { result } = setup(new Section("s1", "S"), [], null);
		const [handleDragOver] = result.current;
		const event = fakeProgramDragEvent(0, 0, "prog1");

		act(() => handleDragOver(event));

		expect(event.dataTransfer.dropEffect).toBe("copy");
	});

	it("autorise le dépôt d'une bobine sur la 2e ligne d'un bloc, dans une colonne libre", () => {
		const section = new Section("s1", "S");
		const timer = createTimerBlockElement(
			{ name: "T1", timerType: "TON", pt: "T#5s" },
			0,
			0,
		);
		section.elements = [timer];
		const { result } = setup(section, [], { kind: "coil", type: "normal" });
		const [, handleDrop] = result.current;

		// (row 1, col 4) : ligne traversée par le bloc mais hors de ses colonnes (0-1).
		act(() => handleDrop(fakeDragEvent(colToX(4), rowToY(1))));

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [commands] = executeOperation.mock.calls[0];
		expect(commands[0]).toBeInstanceOf(ElementsAddCommand);
		expect(commands[0].payload.elements[0]).toMatchObject({
			type: "coil",
			position: { row: 1, col: 4 },
		});
	});

	it("refuse le dépôt d'une bobine sur une cellule couverte par la 2e ligne d'un bloc", () => {
		const section = new Section("s1", "S");
		const timer = createTimerBlockElement(
			{ name: "T1", timerType: "TON", pt: "T#5s" },
			0,
			0,
		);
		section.elements = [timer];
		const { result } = setup(section, [], { kind: "coil", type: "normal" });
		const [, handleDrop] = result.current;

		act(() => handleDrop(fakeDragEvent(colToX(1), rowToY(1))));

		expect(executeOperation).not.toHaveBeenCalled();
	});

	it("refuse le dépôt d'un programme dont l'empreinte chevauche la 2e ligne d'un bloc", () => {
		const section = new Section("s1", "S");
		const timer = createTimerBlockElement(
			{ name: "T1", timerType: "TON", pt: "T#5s" },
			0,
			0,
		);
		section.elements = [timer];
		const { result } = setup(section, [], null);
		const [, handleDrop] = result.current;

		act(() => handleDrop(fakeProgramDragEvent(colToX(1), rowToY(1), "prog2")));

		expect(executeOperation).not.toHaveBeenCalled();
	});

	it("refuse le dépôt d'un programme sur une cellule déjà occupée", () => {
		const section = new Section("s1", "S");
		const existing = createUserProgramBlockElement("prog1", 0, 1);
		section.elements = [existing];
		const { result } = setup(section, [], null);
		const [, handleDrop] = result.current;

		act(() => handleDrop(fakeProgramDragEvent(colToX(1), rowToY(0), "prog2")));

		expect(executeOperation).not.toHaveBeenCalled();
	});
});
