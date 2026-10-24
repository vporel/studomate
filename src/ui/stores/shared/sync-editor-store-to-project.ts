import { StoreApi } from "zustand";

type EditorStoreState = {
	hasCommandsToUndo: boolean;
	hasCommandsToRedo: boolean;
};

type SyncHandlers<S extends EditorStoreState, P extends { id: string }> = {
	select: (state: S) => P;
	push: (program: P) => void;
	setStoreValues: (
		programId: string,
		values: { hasCommandsToUndo: boolean; hasCommandsToRedo: boolean },
	) => void;
};

/**
 * Forwards the changes of an editor store (grafcet, ladder, HMI page) to the project.
 *
 * `store.subscribe` without a selector fires on **every** store change, including a mere node
 * selection (which only touches `nodes`/`edges`, not the program). Without the guard on the
 * program reference, `push` would rerun its deep comparison of the whole program on every
 * selection frame even though the program has not moved.
 *
 * Only depends on the vanilla zustand store, so it is testable without mounting React.
 *
 * @returns The unsubscribe function.
 */
export default function syncEditorStoreToProject<
	S extends EditorStoreState,
	P extends { id: string },
>(
	store: StoreApi<S>,
	{ select, push, setStoreValues }: SyncHandlers<S, P>,
): () => void {
	let lastProgram = select(store.getState());
	let lastHasCommandsToUndo = store.getState().hasCommandsToUndo;
	let lastHasCommandsToRedo = store.getState().hasCommandsToRedo;
	return store.subscribe((state) => {
		const program = select(state);
		if (program !== lastProgram) {
			lastProgram = program;
			push(program);
		}
		if (
			state.hasCommandsToUndo !== lastHasCommandsToUndo ||
			state.hasCommandsToRedo !== lastHasCommandsToRedo
		) {
			lastHasCommandsToUndo = state.hasCommandsToUndo;
			lastHasCommandsToRedo = state.hasCommandsToRedo;
			setStoreValues(program.id, {
				hasCommandsToUndo: state.hasCommandsToUndo,
				hasCommandsToRedo: state.hasCommandsToRedo,
			});
		}
	});
}
