import { StoreApi } from "zustand";
import { HmiStoreState } from "@/ui/stores/hmi/hmi.store";
import { createStore } from "zustand/vanilla";
import HmiManager from "@/ui/stores/project/managers/hmi.manager";
import { syncHmiPageToProject } from "./hmi-project-sync";

function setup() {
	const store = createStore<Record<string, unknown>>(() => ({
		hmiPage: { id: "x1" },
		hasCommandsToUndo: false,
		hasCommandsToRedo: false,
	}));
	const manager = {
		updateHmiPageData: jest.fn(),
		setStoreValues: jest.fn(),
	};
	const unsubscribe = syncHmiPageToProject(
		store as unknown as StoreApi<HmiStoreState>,
		manager as unknown as HmiManager,
	);
	return { store, manager, unsubscribe };
}

describe("syncHmiPageToProject", () => {
	it("pushes the replaced program through updateHmiPageData", () => {
		const { store, manager, unsubscribe } = setup();
		const next = { id: "x1", changed: true };

		store.setState({ hmiPage: next });

		expect(manager.updateHmiPageData).toHaveBeenCalledWith(next);
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

		store.setState({
			hmiPage: { id: "x1", changed: true },
			hasCommandsToUndo: true,
		});

		expect(manager.updateHmiPageData).not.toHaveBeenCalled();
		expect(manager.setStoreValues).not.toHaveBeenCalled();
	});
});
