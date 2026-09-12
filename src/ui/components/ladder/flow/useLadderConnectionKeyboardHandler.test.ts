/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import ConnectionUpdateCommand from "@/schemas/ladder/commands/connection-update.command";
import { LADDER_CONNECTION_EDGE_TYPE } from "@/ui/utils/ladder/ladder-flow-builder";
import { useLadderStore } from "../context/LadderContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import useLadderConnectionKeyboardHandler from "./useLadderConnectionKeyboardHandler";

jest.mock("../context/LadderContext", () => ({
	useLadderStore: jest.fn(),
}));

describe("useLadderConnectionKeyboardHandler", () => {
	const executeOperation = jest.fn();
	const commandsStackManager = { executeOperation };

	afterEach(() => jest.clearAllMocks());

	function setup(edges: any[]) {
		(useLadderStore as jest.Mock).mockImplementation(
			selectorImplementation({ commandsStackManager }),
		);
		return renderHook(() => useLadderConnectionKeyboardHandler(edges));
	}

	function keyEvent(key: string) {
		return {
			key,
			preventDefault: jest.fn(),
			stopPropagation: jest.fn(),
		} as any;
	}

	it("déplace le coude vers la droite (un quart de cellule) et dispatche ConnectionUpdateCommand", () => {
		const edges = [
			{
				id: "c1",
				type: LADDER_CONNECTION_EDGE_TYPE,
				selected: true,
				data: {
					points: [
						[1, 4],
						[5, 4],
					],
				},
			},
		];
		const { result } = setup(edges);

		result.current(keyEvent("ArrowRight"));

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [commands] = executeOperation.mock.calls[0];
		expect(commands).toHaveLength(1);
		expect(commands[0]).toBeInstanceOf(ConnectionUpdateCommand);
		expect(commands[0].payload).toEqual({
			connectionId: "c1",
			changes: {
				points: [
					[1, 5],
					[5, 5],
				],
			},
			previousChanges: {
				points: [
					[1, 4],
					[5, 4],
				],
			},
		});
	});

	it("déplace le coude vers la gauche", () => {
		const edges = [
			{
				id: "c1",
				type: LADDER_CONNECTION_EDGE_TYPE,
				selected: true,
				data: {
					points: [
						[1, 4],
						[5, 4],
					],
				},
			},
		];
		const { result } = setup(edges);

		result.current(keyEvent("ArrowLeft"));

		const [commands] = executeOperation.mock.calls[0];
		expect(commands[0].payload.changes).toEqual({
			points: [
				[1, 3],
				[5, 3],
			],
		});
	});

	it("ignore une touche autre que gauche/droite", () => {
		const edges = [
			{
				id: "c1",
				type: LADDER_CONNECTION_EDGE_TYPE,
				selected: true,
				data: {
					points: [
						[1, 4],
						[5, 4],
					],
				},
			},
		];
		const { result } = setup(edges);

		result.current(keyEvent("ArrowUp"));

		expect(executeOperation).not.toHaveBeenCalled();
	});

	it("ignore une connexion même-ligne (points vide, aucun segment vertical)", () => {
		const edges = [
			{
				id: "c1",
				type: LADDER_CONNECTION_EDGE_TYPE,
				selected: true,
				data: { points: [] },
			},
		];
		const { result } = setup(edges);

		result.current(keyEvent("ArrowRight"));

		expect(executeOperation).not.toHaveBeenCalled();
	});

	it("ignore si aucune arête sélectionnée", () => {
		const edges = [
			{
				id: "c1",
				type: LADDER_CONNECTION_EDGE_TYPE,
				selected: false,
				data: {
					points: [
						[1, 4],
						[5, 4],
					],
				},
			},
		];
		const { result } = setup(edges);

		result.current(keyEvent("ArrowRight"));

		expect(executeOperation).not.toHaveBeenCalled();
	});

	it("ignore si plusieurs arêtes sont sélectionnées (ambigu)", () => {
		const edges = [
			{
				id: "c1",
				type: LADDER_CONNECTION_EDGE_TYPE,
				selected: true,
				data: {
					points: [
						[1, 4],
						[5, 4],
					],
				},
			},
			{
				id: "c2",
				type: LADDER_CONNECTION_EDGE_TYPE,
				selected: true,
				data: {
					points: [
						[1, 8],
						[5, 8],
					],
				},
			},
		];
		const { result } = setup(edges);

		result.current(keyEvent("ArrowRight"));

		expect(executeOperation).not.toHaveBeenCalled();
	});
});
