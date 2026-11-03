import { ProjectStoreState } from "../project.store";
import { ProjectDocumentType } from "../project.store.types";
import AbstractDocumentsManager from "./abstract-documents.manager";

class FakeDocument {
	name = "";
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
	deleteById(id: string, fn: (project: any) => void) {
		this.deleteDocumentById(id, fn);
	}
	renameById(id: string, name: string) {
		this.renameDocumentById(id, name);
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
		manager: new FakeDocumentsManager(set, () => state, {
			trackEvent: jest.fn(),
		}),
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

	describe("deleteDocumentById", () => {
		function setup(initial: Partial<Record<string, any>> = {}) {
			const closePage = jest.fn();
			const project = {
				docs: {},
				copy: jest.fn(() => ({ ...copy })),
			};
			const copy = { docs: {}, copied: true };
			const made = makeManager({
				project,
				pagesManager: { closePage },
				hasUnsavedChanges: false,
				...initial,
			});
			return { ...made, project, copy, closePage };
		}

		it("gives the callback the copy, drops the stack, closes the page and replaces the project", () => {
			const { manager, getState, project, closePage } = setup();
			const stack = manager.getCommandsStack("a");
			const fn = jest.fn();

			manager.deleteById("a", fn);

			expect(fn).toHaveBeenCalledTimes(1);
			expect(fn.mock.calls[0][0]).not.toBe(project);
			expect(fn.mock.calls[0][0].copied).toBe(true);
			expect(getState().project).toBe(fn.mock.calls[0][0]);
			expect(manager.getCommandsStack("a")).not.toBe(stack);
			expect(closePage).toHaveBeenCalledWith("a");
			expect(getState().hasUnsavedChanges).toBe(true);
		});

		it("does nothing without a project", () => {
			const { manager, getState, closePage } = setup({ project: null });
			const fn = jest.fn();
			manager.deleteById("a", fn);
			expect(fn).not.toHaveBeenCalled();
			expect(closePage).not.toHaveBeenCalled();
			expect(getState().hasUnsavedChanges).toBe(false);
		});
	});

	describe("renameDocumentById", () => {
		function setup(initial: Partial<Record<string, any>> = {}) {
			const original = new FakeDocument("a", "x");
			original.name = "old";
			const project = {
				docs: { a: original } as Record<string, FakeDocument>,
				copy() {
					const docs: Record<string, FakeDocument> = {};
					Object.entries(this.docs).forEach(([k, d]) => {
						const c = d.copy();
						c.name = d.name;
						docs[k] = c;
					});
					return { docs, copy: this.copy };
				},
			};
			const made = makeManager({
				project,
				pagesData: { a: { title: "old" } },
				hasUnsavedChanges: false,
				...initial,
			});
			return { ...made, project, original };
		}

		it("renames the copy only, updates the tab title and syncs mounted stores", () => {
			const { manager, getState, original } = setup();
			const pagesData = getState().pagesData;
			const sync = jest.spyOn(manager, "syncMountedStoresFromProject");

			manager.renameById("a", "new");

			expect(original.name).toBe("old");
			expect(getState().project.docs.a.name).toBe("new");
			expect(getState().pagesData.a.title).toBe("new");
			expect(pagesData.a.title).toBe("old");
			expect(getState().hasUnsavedChanges).toBe(true);
			expect(sync).toHaveBeenCalledTimes(1);
		});

		it("leaves pagesData untouched when the tab does not exist", () => {
			const { manager, getState } = setup({ pagesData: {} });
			const pagesData = getState().pagesData;
			manager.renameById("a", "new");
			expect(getState().pagesData).toBe(pagesData);
			expect(getState().project.docs.a.name).toBe("new");
		});

		it("returns silently when the document is absent", () => {
			const { manager, getState, project } = setup();
			const sync = jest.spyOn(manager, "syncMountedStoresFromProject");
			manager.renameById("zzz", "new");
			expect(getState().project).toBe(project);
			expect(getState().hasUnsavedChanges).toBe(false);
			expect(sync).not.toHaveBeenCalled();
		});

		it("returns silently without a project", () => {
			const { manager, getState } = setup({ project: null });
			const sync = jest.spyOn(manager, "syncMountedStoresFromProject");
			manager.renameById("a", "new");
			expect(getState().hasUnsavedChanges).toBe(false);
			expect(getState().pagesData.a.title).toBe("old");
			expect(sync).not.toHaveBeenCalled();
		});
	});
});
