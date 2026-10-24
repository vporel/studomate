import { StoreApi } from "zustand";
import { GrafcetStoreState } from "@/ui/stores/grafcet/grafcet.store";
import { createStore } from "zustand/vanilla";
import GrafcetsManager from "@/ui/stores/project/managers/grafcets.manager";
import { syncGrafcetToProject } from "./grafcet-project-sync";

function setup() {
	const store = createStore<Record<string, unknown>>(() => ({
		grafcet: { id: "x1" },
		hasCommandsToUndo: false,
		hasCommandsToRedo: false,
	}));
	const manager = {
		updateProgramData: jest.fn(),
		setStoreValues: jest.fn(),
	};
	const unsubscribe = syncGrafcetToProject(store as unknown as StoreApi<GrafcetStoreState>, manager as unknown as GrafcetsManager);
	return { store, manager, unsubscribe };
}

describe("syncGrafcetToProject", () => {
	it("pushes the replaced program through updateProgramData", () => {
		const { store, manager, unsubscribe } = setup();
		const next = { id: "x1", changed: true };

		store.setState({ grafcet: next });

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

		store.setState({ grafcet: { id: "x1", changed: true }, hasCommandsToUndo: true });

		expect(manager.updateProgramData).not.toHaveBeenCalled();
		expect(manager.setStoreValues).not.toHaveBeenCalled();
	});
});
