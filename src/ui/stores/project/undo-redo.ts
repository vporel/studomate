import { ProjectStoreState } from "./project.store";
import activeDocumentsManager from "./active-documents.selector";
import { canEdit } from "./editability";

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
	const documents = activeDocumentsManager(state);
	if (!documents) return state.commandsStackManager;
	return documents.getActiveStoreManagers()?.commandsStackManager ?? null;
}

export function canUndoActiveScope(state: ProjectStoreState): boolean {
	if (!canEdit(state)) return false;
	const documents = activeDocumentsManager(state);
	if (!documents) return state.hasCommandsToUndo;
	return documents.getActiveStoreValues()?.hasCommandsToUndo ?? false;
}

export function canRedoActiveScope(state: ProjectStoreState): boolean {
	if (!canEdit(state)) return false;
	const documents = activeDocumentsManager(state);
	if (!documents) return state.hasCommandsToRedo;
	return documents.getActiveStoreValues()?.hasCommandsToRedo ?? false;
}

export function performUndo(state: ProjectStoreState): void {
	if (!canUndoActiveScope(state)) return;
	activeCommandsStackManager(state)?.undoOperation();
}

export function performRedo(state: ProjectStoreState): void {
	if (!canRedoActiveScope(state)) return;
	activeCommandsStackManager(state)?.redoOperation();
}
