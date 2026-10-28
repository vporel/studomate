/**
 * @jest-environment jsdom
 */
import { createClipboardStore } from "@/ui/stores/shared/clipboard.store";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import type { ProjectStoreState } from "@/ui/stores/project/project.store.types";
import { toast } from "react-toastify";
import type { StoreApi } from "zustand";
import handleEditingShortcut, { type ShortcutEvent } from "./editing-shortcuts";

jest.mock("react-toastify", () => ({ toast: { error: jest.fn() } }));
jest.mock("@/ui/lib/mouse-position", () => ({
	getLastMousePosition: () => ({ x: 3, y: 4 }),
}));

function event(key: string, init: Partial<ShortcutEvent> = {}): ShortcutEvent {
	return {
		key,
		ctrlKey: false,
		metaKey: false,
		shiftKey: false,
		target: document.body,
		stopPropagation: jest.fn(),
		preventDefault: jest.fn(),
		...init,
	};
}

function setup({
	mode = ProjectMode.DESIGN,
	editingEnabled = true,
	activeScopeType = "grafcet",
}: {
	mode?: ProjectMode;
	editingEnabled?: boolean;
	activeScopeType?: "grafcet" | "ladder" | "hmi" | "project";
} = {}) {
	const copyCutPaste = {
		copySelectedElements: jest.fn(),
		pasteElements: jest.fn(),
		cutSelectedElements: jest.fn(),
	};
	const selectAllNodesAndEdges = jest.fn();
	const removeSelectedWidgets = jest.fn();
	const moveSelectedWidgets = jest.fn();
	const undoActiveScope = jest.fn();
	const redoActiveScope = jest.fn();
	const managers = {
		copyCutPasteManager: copyCutPaste,
		viewManager: { selectAllNodesAndEdges },
		removeSelectedWidgets,
		moveSelectedWidgets,
		selectAllWidgets: jest.fn(),
	};
	const manager = { getActiveStoreManagers: () => managers };
	const state = {
		mode,
		editingEnabled,
		activeScopeType,
		clipboard: createClipboardStore(),
		grafcetsManager: manager,
		laddersManager: manager,
		hmiManager: manager,
		undoActiveScope,
		redoActiveScope,
	} as unknown as ProjectStoreState;
	const store = { getState: () => state } as StoreApi<ProjectStoreState>;
	return {
		store,
		state,
		copyCutPaste,
		selectAllNodesAndEdges,
		removeSelectedWidgets,
		moveSelectedWidgets,
		undoActiveScope,
		redoActiveScope,
	};
}

describe("handleEditingShortcut", () => {
	afterEach(() => jest.clearAllMocks());

	it("ignores what is typed in a text field", () => {
		const { store, copyCutPaste } = setup();
		const input = document.createElement("input");

		const handled = handleEditingShortcut(
			event("c", { ctrlKey: true, target: input }),
			store,
		);

		expect(handled).toBe(false);
		expect(copyCutPaste.copySelectedElements).not.toHaveBeenCalled();
	});

	it("does not take over keys it has no shortcut for", () => {
		const { store } = setup();
		const e = event("q", { ctrlKey: true });

		expect(handleEditingShortcut(e, store)).toBe(false);
		expect(e.preventDefault).not.toHaveBeenCalled();
	});

	describe("on an editable project", () => {
		it("selects everything with Ctrl+A", () => {
			const { store, selectAllNodesAndEdges } = setup();

			expect(handleEditingShortcut(event("a", { ctrlKey: true }), store)).toBe(
				true,
			);
			expect(selectAllNodesAndEdges).toHaveBeenCalled();
		});

		it("undoes and redoes", () => {
			const { store, undoActiveScope, redoActiveScope } = setup();

			handleEditingShortcut(event("z", { metaKey: true }), store);
			handleEditingShortcut(event("y", { ctrlKey: true }), store);

			expect(undoActiveScope).toHaveBeenCalledTimes(1);
			expect(redoActiveScope).toHaveBeenCalledTimes(1);
		});

		it("copies, cuts and pastes at the last mouse position", () => {
			const { store, copyCutPaste } = setup();

			handleEditingShortcut(event("c", { ctrlKey: true }), store);
			handleEditingShortcut(event("x", { ctrlKey: true }), store);
			handleEditingShortcut(event("v", { ctrlKey: true }), store);

			expect(copyCutPaste.copySelectedElements).toHaveBeenCalled();
			expect(copyCutPaste.cutSelectedElements).toHaveBeenCalled();
			expect(copyCutPaste.pasteElements).toHaveBeenCalledWith({ x: 3, y: 4 });
		});

		it("refuses to paste what was copied in another kind of page", () => {
			const { store, state, copyCutPaste } = setup();
			state.clipboard.getState().setEntry({ scope: "ladder", data: {} });

			handleEditingShortcut(event("v", { ctrlKey: true }), store);

			expect(toast.error).toHaveBeenCalled();
			expect(copyCutPaste.pasteElements).not.toHaveBeenCalled();
		});

		it("removes the selected HMI widgets with Delete, and moves them with the arrows", () => {
			const { store, removeSelectedWidgets, moveSelectedWidgets } = setup({
				activeScopeType: "hmi",
			});

			handleEditingShortcut(event("Delete"), store);
			handleEditingShortcut(event("ArrowRight"), store);

			expect(removeSelectedWidgets).toHaveBeenCalled();
			expect(moveSelectedWidgets).toHaveBeenCalledWith(10, 0);
		});

		it("leaves Delete to React Flow for a grafcet", () => {
			const { store, removeSelectedWidgets } = setup();

			expect(handleEditingShortcut(event("Delete"), store)).toBe(false);
			expect(removeSelectedWidgets).not.toHaveBeenCalled();
		});
	});

	describe("on a project that cannot be edited", () => {
		it.each([
			["read-only", { editingEnabled: false }],
			["in simulation", { mode: ProjectMode.SIMULATION }],
		])("%s: copies and undoes, but modifies nothing", (_, options) => {
			const ctx = setup({ ...options, activeScopeType: "grafcet" });

			handleEditingShortcut(event("c", { ctrlKey: true }), ctx.store);
			handleEditingShortcut(event("x", { ctrlKey: true }), ctx.store);
			handleEditingShortcut(event("v", { ctrlKey: true }), ctx.store);
			handleEditingShortcut(event("a", { ctrlKey: true }), ctx.store);

			expect(ctx.copyCutPaste.copySelectedElements).toHaveBeenCalled();
			expect(ctx.copyCutPaste.cutSelectedElements).not.toHaveBeenCalled();
			expect(ctx.copyCutPaste.pasteElements).not.toHaveBeenCalled();
			expect(ctx.selectAllNodesAndEdges).not.toHaveBeenCalled();
		});

		it("does not remove or move HMI widgets", () => {
			const ctx = setup({ editingEnabled: false, activeScopeType: "hmi" });

			handleEditingShortcut(event("Delete"), ctx.store);
			handleEditingShortcut(event("ArrowUp"), ctx.store);

			expect(ctx.removeSelectedWidgets).not.toHaveBeenCalled();
			expect(ctx.moveSelectedWidgets).not.toHaveBeenCalled();
		});
	});
});
