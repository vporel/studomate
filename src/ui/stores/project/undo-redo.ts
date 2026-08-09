import { ProjectStoreState } from "./project.store";
import { ProjectMode } from "./ProjectMode.enum";

/**
 * Undo/redo is scoped to the active document, like in any multi-document editor: Ctrl+Z in
 * a grafcet undoes the last action *in that grafcet*, not the last action anywhere in the
 * project. Each grafcet therefore has its own history, and the project has one of its own
 * for what does not belong to a grafcet (variables, project properties).
 *
 * These helpers are the single place where that arbitration happens.
 *
 * They take the state rather than being hooks, so that they serve both the components and
 * the imperative keyboard handler.
 */

function activeCommandsStackManager(state: ProjectStoreState) {
	if (state.activeScopeType === "grafcet") {
		return state.grafcetsManager.getActiveStoreManagers()?.commandsStackManager ?? null;
	}
	if (state.activeScopeType === "ladder") {
		return state.laddersManager.getActiveStoreManagers()?.commandsStackManager ?? null;
	}
	return state.commandsStackManager;
}

export function canUndoActiveScope(state: ProjectStoreState): boolean {
	if (state.mode !== ProjectMode.DESIGN) return false;
	if (state.activeScopeType === "grafcet") {
		return state.grafcetsManager.getActiveStoreValues()?.hasCommandsToUndo ?? false;
	}
	if (state.activeScopeType === "ladder") {
		return state.laddersManager.getActiveStoreValues()?.hasCommandsToUndo ?? false;
	}
	return state.hasCommandsToUndo;
}

export function canRedoActiveScope(state: ProjectStoreState): boolean {
	if (state.mode !== ProjectMode.DESIGN) return false;
	if (state.activeScopeType === "grafcet") {
		return state.grafcetsManager.getActiveStoreValues()?.hasCommandsToRedo ?? false;
	}
	if (state.activeScopeType === "ladder") {
		return state.laddersManager.getActiveStoreValues()?.hasCommandsToRedo ?? false;
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
