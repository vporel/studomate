/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "./ProjectContext";
import useGotoProgram from "./useGotoProgram";

jest.mock("./ProjectContext");

describe("useGotoProgram", () => {
	const openPage = jest.fn();
	const highlight = jest.fn();
	const getActiveStoreManagers = jest.fn(() => ({
		viewManager: { temporarilyHighlightNodesAndEdges: highlight },
	}));

	beforeEach(() => {
		jest.useFakeTimers();
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				project: {
					getGrafcet: (id: string) => (id === "g1" ? { name: "Feu" } : null),
					getLadder: (id: string) => (id === "l1" ? { name: "Pompe" } : null),
				},
				grafcetsManager: { getActiveStoreManagers },
				laddersManager: { getActiveStoreManagers },
				pagesManager: { openPage },
			}),
		);
	});
	afterEach(() => {
		jest.useRealTimers();
		jest.clearAllMocks();
	});

	it("opens the page of the program, titled with its name", () => {
		const { result } = renderHook(() => useGotoProgram());

		result.current("g1", "grafcet");

		expect(openPage).toHaveBeenCalledWith({
			type: "grafcet",
			id: "g1",
			title: "Feu",
		});
	});

	it("falls back to an unknown name for a program that no longer exists", () => {
		const { result } = renderHook(() => useGotoProgram());

		result.current("gone", "ladder");

		expect(openPage).toHaveBeenCalledWith({
			type: "ladder",
			id: "gone",
			title: "Nom inconnu",
		});
	});

	it("highlights the element once the page is active", () => {
		const { result } = renderHook(() => useGotoProgram());

		result.current("g1", "grafcet", "step-1");
		expect(highlight).not.toHaveBeenCalled();
		jest.advanceTimersByTime(100);

		expect(highlight).toHaveBeenCalledWith(["step-1"], [], 3000);
	});

	describe("with its own way of opening the page", () => {
		it("uses it instead of adding a tab", () => {
			const open = jest.fn(() => true);
			const { result } = renderHook(() => useGotoProgram(open));

			result.current("l1", "ladder");

			expect(open).toHaveBeenCalledWith({
				type: "ladder",
				id: "l1",
				title: "Pompe",
			});
			expect(openPage).not.toHaveBeenCalled();
		});

		it("still highlights the element when the page was opened", () => {
			const { result } = renderHook(() => useGotoProgram(() => true));

			result.current("g1", "grafcet", "step-1");
			jest.advanceTimersByTime(100);

			expect(highlight).toHaveBeenCalled();
		});

		it("highlights nothing when the page could not be opened", () => {
			const { result } = renderHook(() => useGotoProgram(() => false));

			result.current("g1", "grafcet", "step-1");
			jest.advanceTimersByTime(100);

			expect(highlight).not.toHaveBeenCalled();
		});
	});
});
