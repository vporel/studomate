/** @jest-environment jsdom */
import { renderHook } from "@testing-library/react";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useLadderStore } from "@/ui/components/ladder/context/LadderContext";
import {
	PendingSystemBlockCreation,
	PendingSystemBlockEdit,
} from "@/ui/utils/ladder/ladder-system-block-drag";
import { useSystemBlockDialog } from "./useSystemBlockDialog";

jest.mock("@/ui/components/ladder/context/LadderContext");

const creation = (blockType: "timer" | "counter"): PendingSystemBlockCreation =>
	({ blockType, insert: jest.fn() }) as unknown as PendingSystemBlockCreation;
const edit = (blockType: "timer" | "counter"): PendingSystemBlockEdit =>
	({
		blockType,
		elementId: "b1",
		initial: {},
	}) as unknown as PendingSystemBlockEdit;

function setup(
	blockType: "timer" | "counter",
	{
		pendingCreation = null,
		pendingEdit = null,
	}: {
		pendingCreation?: PendingSystemBlockCreation | null;
		pendingEdit?: PendingSystemBlockEdit | null;
	} = {},
) {
	const setPendingSystemBlockCreation = jest.fn();
	const setPendingSystemBlockEdit = jest.fn();
	const commandsStackManager = {};
	(useLadderStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			pendingSystemBlockCreation: pendingCreation,
			setPendingSystemBlockCreation,
			pendingSystemBlockEdit: pendingEdit,
			setPendingSystemBlockEdit,
			commandsStackManager,
		}),
	);
	const { result } = renderHook(() => useSystemBlockDialog(blockType));
	return {
		result,
		setPendingSystemBlockCreation,
		setPendingSystemBlockEdit,
		commandsStackManager,
	};
}

describe("useSystemBlockDialog", () => {
	it("is closed when nothing is pending", () => {
		const { result } = setup("timer");

		expect(result.current).toMatchObject({
			creating: false,
			editing: false,
			open: false,
		});
	});

	it("opens in creation for its own block type", () => {
		const { result } = setup("timer", { pendingCreation: creation("timer") });

		expect(result.current).toMatchObject({
			creating: true,
			editing: false,
			open: true,
		});
	});

	it("opens in edition for its own block type", () => {
		const { result } = setup("counter", { pendingEdit: edit("counter") });

		expect(result.current).toMatchObject({
			creating: false,
			editing: true,
			open: true,
		});
	});

	it("stays closed for another block type", () => {
		const { result } = setup("counter", {
			pendingCreation: creation("timer"),
			pendingEdit: edit("timer"),
		});

		expect(result.current.open).toBe(false);
	});

	it("exposes the commands stack manager", () => {
		const { result, commandsStackManager } = setup("timer");

		expect(result.current.commandsStackManager).toBe(commandsStackManager);
	});

	it("close clears both pending states", () => {
		const { result, setPendingSystemBlockCreation, setPendingSystemBlockEdit } =
			setup("timer", { pendingCreation: creation("timer") });

		result.current.close();

		expect(setPendingSystemBlockCreation).toHaveBeenCalledWith(null);
		expect(setPendingSystemBlockEdit).toHaveBeenCalledWith(null);
	});
});
