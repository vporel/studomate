import { ProjectStoreState } from "./project.store";
import { ProjectMode } from "./ProjectMode.enum";

/**
 * Undo/redo is scoped to the active document, like in any multi-document editor: Ctrl+Z in
 * a grafcet undoes the last action *in that grafcet*, not the last action anywhere in the
 * project. Each grafcet therefore has its own history, and the project has one of its own
 * for what does not belong to a grafcet (variables, project properties).
 *
 * These helpers are the single place where that arbitration happens. It used to be copied
 * in four files (edit menu, keyboard shortcuts, undo button, redo button), each free to
 * drift from the others.
 *
 * They take the state rather than being hooks, so that they serve both the components and
 * the imperative keyboard handler.
 */

function activeCommandsStackManager(state: ProjectStoreState) {
	if (state.activeScopeType === "grafcet") {
		return state.grafcetsManager.getActiveGrafcetStoreManagers()?.commandsStackManager ?? null;
	}
	return state.commandsStackManager;
}

export function canUndoActiveScope(state: ProjectStoreState): boolean {
	if (state.mode !== ProjectMode.DESIGN) return false;
	if (state.activeScopeType === "grafcet") {
		return state.grafcetsManager.getActiveGrafcetStoreValues()?.hasCommandsToUndo ?? false;
	}
	return state.hasCommandsToUndo;
}

export function canRedoActiveScope(state: ProjectStoreState): boolean {
	if (state.mode !== ProjectMode.DESIGN) return false;
	if (state.activeScopeType === "grafcet") {
		return state.grafcetsManager.getActiveGrafcetStoreValues()?.hasCommandsToRedo ?? false;
	}
	return state.hasCommandsToRedo;
}

export function performUndo(state: ProjectStoreState): void {
	if (!canUndoActiveScope(state)) return;
	activeCommandsStackManager(state)?.undoOperation();
}

export function performRedo(state: ProjectStoreState): void {
	if (!canRedoActiveScope(state)) return;
	activeCommandsStackManager(state)?.redoOperation();
}
