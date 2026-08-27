/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import useGotoProgram from "@/ui/components/projects/useGotoProgram";
import { createTimerBlockElement } from "@/schemas/function-blocks/timer.schema";
import useBlockInstanceMenuItems from "./useBlockInstanceMenuItems";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/components/projects/useGotoProgram");

describe("useBlockInstanceMenuItems", () => {
	const onGotoProgram = jest.fn();
	const timerElement = createTimerBlockElement(
		{ name: "Tempo1", timerType: "TON", pt: "T#5s" },
		0,
		0,
	);

	function setup(getActiveStoreManagers: jest.Mock) {
		(useGotoProgram as unknown as jest.Mock).mockReturnValue(onGotoProgram);
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			(selector: any) =>
				selector({
					project: {
						getLadder: () => ({
							findElement: () => ({ element: timerElement }),
						}),
					},
					laddersManager: { getActiveStoreManagers },
				}),
		);
		const { result } = renderHook(() => useBlockInstanceMenuItems());
		return result.current("l1", timerElement.id);
	}

	beforeEach(() => jest.useFakeTimers());
	afterEach(() => {
		jest.useRealTimers();
		jest.clearAllMocks();
	});

	it("ouvre immédiatement l'éditeur si le manager est déjà actif au premier essai", () => {
		const openSystemBlockEditor = jest.fn();
		const getActiveStoreManagers = jest.fn(() => ({
			workflowManager: { openSystemBlockEditor },
		}));
		const items = setup(getActiveStoreManagers);

		items[1][0].onClick!();
		jest.advanceTimersByTime(20);

		expect(onGotoProgram).toHaveBeenCalledWith("l1", "ladder");
		expect(openSystemBlockEditor).toHaveBeenCalledWith(
			timerElement.id,
			"timer",
			timerElement.data.params,
		);
	});

	it("réessaie tant que le manager n'est pas encore actif, puis ouvre l'éditeur", () => {
		const openSystemBlockEditor = jest.fn();
		let callCount = 0;
		const getActiveStoreManagers = jest.fn(() => {
			callCount += 1;
			return callCount < 4
				? null
				: { workflowManager: { openSystemBlockEditor } };
		});
		const items = setup(getActiveStoreManagers);

		items[1][0].onClick!();
		jest.advanceTimersByTime(200);

		expect(openSystemBlockEditor).toHaveBeenCalledWith(
			timerElement.id,
			"timer",
			timerElement.data.params,
		);
	});

	it("abandonne sans planter si le manager ne devient jamais actif", () => {
		const getActiveStoreManagers = jest.fn(() => null);
		const items = setup(getActiveStoreManagers);

		items[1][0].onClick!();
		expect(() => jest.advanceTimersByTime(2000)).not.toThrow();
		expect(getActiveStoreManagers.mock.calls.length).toBeLessThanOrEqual(25);
	});
});
