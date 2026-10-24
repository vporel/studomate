import { ProjectStoreState } from "../project.store";
import { ProjectDocumentType } from "../project.store.types";
import AbstractDocumentsManager from "./abstract-documents.manager";

class FakeDocument {
	constructor(
		public id: string,
		public content: string,
	) {}
	copy(): FakeDocument {
		return new FakeDocument(this.id, this.content);
	}
}

type FakeValues = { selected?: string; zoom?: number };
type FakeManagers = {
	commandsStackManager: { refreshFlags: jest.Mock };
	held: FakeDocument;
	adopt: jest.Mock;
};

class FakeDocumentsManager extends AbstractDocumentsManager<
	FakeDocument,
	FakeValues,
	FakeManagers
> {
	protected readonly documentType: ProjectDocumentType = "hmi";

	protected getDocument(project: any, id: string) {
		return project.docs[id] as FakeDocument | undefined;
	}
	protected getStoresValues(state: ProjectStoreState) {
		return (state as any).values as Record<string, FakeValues>;
	}
	protected setStoresValues(values: Record<string, FakeValues>) {
		return { values } as any;
	}
	protected getStoresManagers(state: ProjectStoreState) {
		return (state as any).managers as Record<string, FakeManagers>;
	}
	protected setStoresManagers(managers: Record<string, FakeManagers>) {
		return { managers } as any;
	}
	protected adoptDocument(managers: FakeManagers, document: FakeDocument) {
		managers.adopt(document);
	}
	protected getAdoptedDocument(managers: FakeManagers) {
		return managers.held;
	}

	dropStack(id: string) {
		this.deleteCommandsStack(id);
	}
}

function makeManagers(held: FakeDocument): FakeManagers {
	return {
		commandsStackManager: { refreshFlags: jest.fn() },
		held,
		adopt: jest.fn(),
	};
}

function makeManager(initial: Partial<Record<string, any>> = {}) {
	let state = {
		project: { docs: {} },
		activeScope: null,
		activeScopeType: "project",
		values: {},
		managers: {},
		...initial,
	} as unknown as ProjectStoreState;
	const set = (partial: any) => {
		const patch = typeof partial === "function" ? partial(state) : partial;
		state = { ...state, ...patch } as ProjectStoreState;
	};
	return {
		manager: new FakeDocumentsManager(set, () => state),
		getState: () => state as any,
	};
}

describe("AbstractDocumentsManager", () => {
	describe("commands stacks", () => {
		it("returns the same stack instance for a given id", () => {
			const { manager } = makeManager();
			expect(manager.getCommandsStack("a")).toBe(manager.getCommandsStack("a"));
			expect(manager.getCommandsStack("a")).not.toBe(
				manager.getCommandsStack("b"),
			);
		});

		it("clearCommandsStacks drops the stacks", () => {
			const { manager } = makeManager();
			const stack = manager.getCommandsStack("a");
			manager.clearCommandsStacks();
			expect(manager.getCommandsStack("a")).not.toBe(stack);
		});

		it("deleteCommandsStack drops only the given stack", () => {
			const { manager } = makeManager();
			const a = manager.getCommandsStack("a");
			const b = manager.getCommandsStack("b");
			manager.dropStack("a");
			expect(manager.getCommandsStack("a")).not.toBe(a);
			expect(manager.getCommandsStack("b")).toBe(b);
		});

		it("clearCommandsStacksOf empties the given stacks, keeps them and refreshes mounted stores", () => {
			const mounted = makeManagers(new FakeDocument("a", "x"));
			const { manager } = makeManager({ managers: { a: mounted } });
			const stackA = manager.getCommandsStack("a");
			const stackB = manager.getCommandsStack("b");
			const clearA = jest.spyOn(stackA, "clear");
			const clearB = jest.spyOn(stackB, "clear");

			manager.clearCommandsStacksOf(["a", "unknown"]);

			expect(clearA).toHaveBeenCalledTimes(1);
			expect(clearB).not.toHaveBeenCalled();
			expect(manager.getCommandsStack("a")).toBe(stackA);
			expect(mounted.commandsStackManager.refreshFlags).toHaveBeenCalledTimes(
				1,
			);
		});

		it("clearCommandsStacksOf refreshes a mounted store even without a stack", () => {
			const mounted = makeManagers(new FakeDocument("a", "x"));
			const { manager } = makeManager({ managers: { a: mounted } });
			manager.clearCommandsStacksOf(["a"]);
			expect(mounted.commandsStackManager.refreshFlags).toHaveBeenCalledTimes(
				1,
			);
		});
	});

	describe("stores registry", () => {
		it("registerStoreManager adds and keeps the other entries", () => {
			const { manager, getState } = makeManager();
			const a = makeManagers(new FakeDocument("a", "x"));
			const b = makeManagers(new FakeDocument("b", "y"));
			manager.registerStoreManager("a", a);
			manager.registerStoreManager("b", b);
			expect(getState().managers).toEqual({ a, b });
		});

		it("deleteStoreManager removes only the given entry", () => {
			const a = makeManagers(new FakeDocument("a", "x"));
			const b = makeManagers(new FakeDocument("b", "y"));
			const { manager, getState } = makeManager({ managers: { a, b } });
			manager.deleteStoreManager("a");
			expect(getState().managers).toEqual({ b });
		});

		it("setStoreValues merges into the existing values of the document", () => {
			const { manager, getState } = makeManager({
				values: { a: { selected: "w1" }, b: { zoom: 2 } },
			});
			manager.setStoreValues("a", { zoom: 1 });
			manager.setStoreValues("c", { zoom: 3 });
			expect(getState().values).toEqual({
				a: { selected: "w1", zoom: 1 },
				b: { zoom: 2 },
				c: { zoom: 3 },
			});
		});
	});

	describe("active store", () => {
		const a = makeManagers(new FakeDocument("a", "x"));

		it("returns null when the active scope type differs", () => {
			const { manager } = makeManager({
				activeScope: "a",
				activeScopeType: "grafcet",
				values: { a: { zoom: 1 } },
				managers: { a },
			});
			expect(manager.getActiveStoreValues()).toBeNull();
			expect(manager.getActiveStoreManagers()).toBeNull();
		});

		it("returns null without an active scope", () => {
			const { manager } = makeManager({
				activeScope: null,
				activeScopeType: "hmi",
				values: { a: { zoom: 1 } },
				managers: { a },
			});
			expect(manager.getActiveStoreValues()).toBeNull();
			expect(manager.getActiveStoreManagers()).toBeNull();
		});

		it("returns null when the active document has no entry", () => {
			const { manager } = makeManager({
				activeScope: "z",
				activeScopeType: "hmi",
			});
			expect(manager.getActiveStoreValues()).toBeNull();
			expect(manager.getActiveStoreManagers()).toBeNull();
		});

		it("returns the entry of the active document", () => {
			const { manager } = makeManager({
				activeScope: "a",
				activeScopeType: "hmi",
				values: { a: { zoom: 1 } },
				managers: { a },
			});
			expect(manager.getActiveStoreValues()).toEqual({ zoom: 1 });
			expect(manager.getActiveStoreManagers()).toBe(a);
		});
	});

	describe("syncMountedStoresFromProject", () => {
		it("adopts a copy of the project's document when it differs", () => {
			const projectDoc = new FakeDocument("a", "new");
			const mounted = makeManagers(new FakeDocument("a", "old"));
			const { manager } = makeManager({
				project: { docs: { a: projectDoc } },
				managers: { a: mounted },
			});

			manager.syncMountedStoresFromProject();

			expect(mounted.adopt).toHaveBeenCalledTimes(1);
			const adopted = mounted.adopt.mock.calls[0][0];
			expect(adopted).toEqual(projectDoc);
			expect(adopted).not.toBe(projectDoc);
		});

		it("adopts when the mounted store holds nothing yet", () => {
			const mounted = makeManagers(undefined as any);
			const { manager } = makeManager({
				project: { docs: { a: new FakeDocument("a", "x") } },
				managers: { a: mounted },
			});
			manager.syncMountedStoresFromProject();
			expect(mounted.adopt).toHaveBeenCalledTimes(1);
		});

		it("does not adopt when the documents are equal", () => {
			const mounted = makeManagers(new FakeDocument("a", "same"));
			const { manager } = makeManager({
				project: { docs: { a: new FakeDocument("a", "same") } },
				managers: { a: mounted },
			});
			manager.syncMountedStoresFromProject();
			expect(mounted.adopt).not.toHaveBeenCalled();
		});

		it("skips documents unknown to the project", () => {
			const mounted = makeManagers(new FakeDocument("a", "x"));
			const { manager } = makeManager({ managers: { a: mounted } });
			manager.syncMountedStoresFromProject();
			expect(mounted.adopt).not.toHaveBeenCalled();
		});

		it("does nothing without a project", () => {
			const mounted = makeManagers(new FakeDocument("a", "x"));
			const { manager } = makeManager({
				project: null,
				managers: { a: mounted },
			});
			expect(() => manager.syncMountedStoresFromProject()).not.toThrow();
			expect(mounted.adopt).not.toHaveBeenCalled();
		});
	});
});
