/**
 * @jest-environment jsdom
 */
import { act, render } from "@testing-library/react";
import EditorTour from "./EditorTour";

const startTour = jest.fn();
jest.mock("@/ui/components/product-tour/engine/useStartTour", () => ({
	__esModule: true,
	default: () => startTour,
}));

const shouldStartEditorTour = jest.fn();
jest.mock("@/ui/components/product-tour/engine/tour-eligibility", () => ({
	shouldStartEditorTour: (kind: string) => shouldStartEditorTour(kind),
}));

let storeState: {
	activePageId: string | null;
	pagesData: Record<string, { type: string }>;
};
let canEdit = true;
jest.mock("@/ui/components/projects/ProjectContext", () => ({
	useProjectStore: (selector: (state: unknown) => unknown) =>
		selector(storeState),
}));
jest.mock("@/ui/components/projects/useCanEdit", () => ({
	__esModule: true,
	default: () => canEdit,
}));

const advance = () =>
	act(async () => {
		jest.advanceTimersByTime(500);
	});

describe("EditorTour", () => {
	const destroy = jest.fn();

	beforeEach(() => {
		jest.useFakeTimers();
		jest.clearAllMocks();
		canEdit = true;
		storeState = {
			activePageId: "g1",
			pagesData: { g1: { type: "grafcet" }, v1: { type: "variables" } },
		};
		shouldStartEditorTour.mockReturnValue(true);
		startTour.mockResolvedValue({ destroy });
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("starts the tour of the active editor, scoped to its page, once the layout has settled", async () => {
		render(<EditorTour />);
		expect(startTour).not.toHaveBeenCalled();

		await advance();

		expect(shouldStartEditorTour).toHaveBeenCalledWith("grafcet");
		expect(startTour).toHaveBeenCalledWith('[id="page-g1"]');
	});

	it("does nothing on a page that is not an editor", async () => {
		storeState.activePageId = "v1";
		render(<EditorTour />);
		await advance();
		expect(startTour).not.toHaveBeenCalled();
	});

	it("does nothing without an active page", async () => {
		storeState.activePageId = null;
		render(<EditorTour />);
		await advance();
		expect(startTour).not.toHaveBeenCalled();
	});

	it("does nothing when the project cannot be edited", async () => {
		canEdit = false;
		render(<EditorTour />);
		await advance();
		expect(startTour).not.toHaveBeenCalled();
	});

	it("does nothing when not eligible", async () => {
		shouldStartEditorTour.mockReturnValue(false);
		render(<EditorTour />);
		await advance();
		expect(startTour).not.toHaveBeenCalled();
	});

	it("does not start when unmounted before the delay elapses", async () => {
		const { unmount } = render(<EditorTour />);
		unmount();
		await advance();
		expect(startTour).not.toHaveBeenCalled();
	});

	it("destroys the running tour when the active page changes, and evaluates the new editor", async () => {
		storeState.pagesData.l1 = { type: "ladder" };
		const { rerender } = render(<EditorTour />);
		await advance();

		storeState.activePageId = "l1";
		rerender(<EditorTour />);
		expect(destroy).toHaveBeenCalledTimes(1);

		await advance();
		expect(startTour).toHaveBeenLastCalledWith('[id="page-l1"]');
		expect(shouldStartEditorTour).toHaveBeenLastCalledWith("ladder");
	});

	it("destroys the running tour when editing becomes unavailable", async () => {
		const { rerender } = render(<EditorTour />);
		await advance();

		canEdit = false;
		rerender(<EditorTour />);

		expect(destroy).toHaveBeenCalledTimes(1);
	});
});
