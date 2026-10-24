import { createStore } from "zustand/vanilla";
import syncEditorStoreToProject from "./sync-editor-store-to-project";

type Program = { id: string; value: number };
type State = {
	program: Program;
	selection: string[];
	hasCommandsToUndo: boolean;
	hasCommandsToRedo: boolean;
};

function buildStore() {
	return createStore<State>(() => ({
		program: { id: "p1", value: 0 },
		selection: [],
		hasCommandsToUndo: false,
		hasCommandsToRedo: false,
	}));
}

function setup() {
	const store = buildStore();
	const push = jest.fn();
	const setStoreValues = jest.fn();
	const unsubscribe = syncEditorStoreToProject(store, {
		select: (state) => state.program,
		push,
		setStoreValues,
	});
	return { store, push, setStoreValues, unsubscribe };
}

describe("syncEditorStoreToProject", () => {
	it("does not push a change that does not touch the program", () => {
		const { store, push, unsubscribe } = setup();

		store.setState({ selection: ["a"] });

		expect(push).not.toHaveBeenCalled();
		unsubscribe();
	});

	it("pushes a change that actually replaces the program", () => {
		const { store, push, unsubscribe } = setup();
		const program = { id: "p1", value: 1 };

		store.setState({ program });

		expect(push).toHaveBeenCalledTimes(1);
		expect(push).toHaveBeenCalledWith(program);
		unsubscribe();
	});

	it("does not push when only the undo/redo flags change", () => {
		const { store, push, unsubscribe } = setup();

		store.setState({ hasCommandsToUndo: true });

		expect(push).not.toHaveBeenCalled();
		unsubscribe();
	});

	it("does not forward the undo/redo flags when they did not change", () => {
		const { store, setStoreValues, unsubscribe } = setup();

		store.setState({ selection: ["a"] });

		expect(setStoreValues).not.toHaveBeenCalled();
		unsubscribe();
	});

	it("forwards the undo/redo flags with the program id when they change", () => {
		const { store, setStoreValues, unsubscribe } = setup();

		store.setState({
			program: { id: "p1", value: 1 },
			hasCommandsToUndo: true,
		});

		expect(setStoreValues).toHaveBeenCalledTimes(1);
		expect(setStoreValues).toHaveBeenCalledWith("p1", {
			hasCommandsToUndo: true,
			hasCommandsToRedo: false,
		});
		unsubscribe();
	});

	it("forwards the flags when only the redo flag changes", () => {
		const { store, setStoreValues, unsubscribe } = setup();

		store.setState({ hasCommandsToRedo: true });

		expect(setStoreValues).toHaveBeenCalledWith("p1", {
			hasCommandsToUndo: false,
			hasCommandsToRedo: true,
		});
		unsubscribe();
	});

	it("forwards the flags only once for an unchanged value", () => {
		const { store, setStoreValues, unsubscribe } = setup();

		store.setState({ hasCommandsToUndo: true });
		store.setState({ selection: ["a"] });

		expect(setStoreValues).toHaveBeenCalledTimes(1);
		unsubscribe();
	});

	it("stops notifying after unsubscribe", () => {
		const { store, push, setStoreValues, unsubscribe } = setup();
		unsubscribe();

		store.setState({
			program: { id: "p1", value: 1 },
			hasCommandsToUndo: true,
		});

		expect(push).not.toHaveBeenCalled();
		expect(setStoreValues).not.toHaveBeenCalled();
	});
});
