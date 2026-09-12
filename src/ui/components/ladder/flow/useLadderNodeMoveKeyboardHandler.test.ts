/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { useLadderStore } from "../context/LadderContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import useLadderNodeMoveKeyboardHandler from "./useLadderNodeMoveKeyboardHandler";

jest.mock("../context/LadderContext", () => ({
	useLadderStore: jest.fn(),
}));

describe("useLadderNodeMoveKeyboardHandler", () => {
	const moveSelectedElementsByCells = jest.fn();

	afterEach(() => jest.clearAllMocks());

	function setup(nodes: any[]) {
		(useLadderStore as jest.Mock).mockImplementation(
			selectorImplementation({
				workflowManager: { moveSelectedElementsByCells },
			}),
		);
		return renderHook(() => useLadderNodeMoveKeyboardHandler("s1", nodes));
	}

	function keyEvent(key: string, defaultPrevented = false) {
		return {
			key,
			defaultPrevented,
			preventDefault: jest.fn(),
			stopPropagation: jest.fn(),
		} as any;
	}

	const selectedContact = [{ id: "a", type: "contact", selected: true }];

	it.each([
		["ArrowUp", [-1, 0]],
		["ArrowDown", [1, 0]],
		["ArrowLeft", [0, -1]],
		["ArrowRight", [0, 1]],
	])("%s → déplacement (%p)", (key, [dRow, dCol]) => {
		const { result } = setup(selectedContact);
		result.current(keyEvent(key));
		expect(moveSelectedElementsByCells).toHaveBeenCalledWith("s1", dRow, dCol);
	});

	it("ne fait rien sans élément sélectionné", () => {
		const { result } = setup([{ id: "a", type: "contact", selected: false }]);
		result.current(keyEvent("ArrowRight"));
		expect(moveSelectedElementsByCells).not.toHaveBeenCalled();
	});

	it("ignore une borne d'alimentation sélectionnée", () => {
		const { result } = setup([
			{ id: "r", type: "railTerminal", selected: true },
		]);
		result.current(keyEvent("ArrowRight"));
		expect(moveSelectedElementsByCells).not.toHaveBeenCalled();
	});

	it("ne fait rien si la touche a déjà été traitée (defaultPrevented)", () => {
		const { result } = setup(selectedContact);
		result.current(keyEvent("ArrowRight", true));
		expect(moveSelectedElementsByCells).not.toHaveBeenCalled();
	});

	it("ignore une touche non directionnelle", () => {
		const { result } = setup(selectedContact);
		result.current(keyEvent("a"));
		expect(moveSelectedElementsByCells).not.toHaveBeenCalled();
	});
});
