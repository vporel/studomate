import { StoreApi } from "zustand";
import { LadderStoreState } from "@/ui/stores/ladder/ladder.store";
import { createStore } from "zustand/vanilla";
import LaddersManager from "@/ui/stores/project/managers/ladders.manager";
import { syncLadderToProject } from "./ladder-project-sync";

function setup() {
	const store = createStore<Record<string, unknown>>(() => ({
		ladder: { id: "x1" },
		hasCommandsToUndo: false,
		hasCommandsToRedo: false,
	}));
	const manager = {
		updateProgramData: jest.fn(),
		setStoreValues: jest.fn(),
	};
	const unsubscribe = syncLadderToProject(store as unknown as StoreApi<LadderStoreState>, manager as unknown as LaddersManager);
	return { store, manager, unsubscribe };
}

describe("syncLadderToProject", () => {
	it("pushes the replaced program through updateProgramData", () => {
		const { store, manager, unsubscribe } = setup();
		const next = { id: "x1", changed: true };

		store.setState({ ladder: next });

		expect(manager.updateProgramData).toHaveBeenCalledWith(next);
		unsubscribe();
	});

	it("forwards the undo/redo flags through setStoreValues", () => {
		const { store, manager, unsubscribe } = setup();

		store.setState({ hasCommandsToUndo: true });

		expect(manager.setStoreValues).toHaveBeenCalledWith("x1", {
			hasCommandsToUndo: true,
			hasCommandsToRedo: false,
		});
		unsubscribe();
	});

	it("stops notifying the manager after unsubscribe", () => {
		const { store, manager, unsubscribe } = setup();
		unsubscribe();

		store.setState({ ladder: { id: "x1", changed: true }, hasCommandsToUndo: true });

		expect(manager.updateProgramData).not.toHaveBeenCalled();
		expect(manager.setStoreValues).not.toHaveBeenCalled();
	});
});
