import Project from "@/schemas/project/project.schema";
import {
	getPreferredSaveLocation,
	setPreferredSaveLocation,
} from "@/persistence/preferences.storage";
import type { ProjectStoreEnvironment } from "./environment/project-store-environment";
import type {
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
} from "./project.store.types";
import resolveSaveLocationIfNeeded from "./save-location";

jest.mock("@/persistence/preferences.storage", () => ({
	getPreferredSaveLocation: jest.fn(),
	setPreferredSaveLocation: jest.fn(),
}));

type FakeState = {
	projectRepository: unknown;
	ui: {
		saveLocationModalVisible: boolean;
		onSaveLocationChosen: ((location: "local" | "cloud" | null) => void) | null;
	};
};

describe("resolveSaveLocationIfNeeded", () => {
	const project = { id: "p1" } as Project;
	let state: FakeState;
	let get: ProjectStoreGetFunction;
	let set: ProjectStoreSetFunction;
	let user: unknown;
	let env: ProjectStoreEnvironment;

	const makeRepo = (location: "local" | "cloud", existing: unknown = null) => ({
		locationOf: jest.fn(() => location),
		moveToCloud: jest.fn(),
		moveToLocal: jest.fn(),
		get: jest.fn(async () => existing),
	});

	beforeEach(() => {
		jest.clearAllMocks();
		state = {
			projectRepository: makeRepo("local"),
			ui: { saveLocationModalVisible: false, onSaveLocationChosen: null },
		};
		get = (() => state) as unknown as ProjectStoreGetFunction;
		set = ((partial: unknown) => {
			const update =
				typeof partial === "function"
					? (partial as (s: FakeState) => Partial<FakeState>)(state)
					: (partial as Partial<FakeState>);
			state = { ...state, ...update };
		}) as unknown as ProjectStoreSetFunction;
		user = null;
		env = {
			persistence: { auth: { store: { getState: () => ({ user }) } } },
		} as unknown as ProjectStoreEnvironment;
		(getPreferredSaveLocation as jest.Mock).mockReturnValue(null);
	});

	const resolve = () => resolveSaveLocationIfNeeded(project, get, set, env);

	it("returns undefined without persistence (embedded block)", async () => {
		env = {} as ProjectStoreEnvironment;
		await expect(resolve()).resolves.toBeUndefined();
	});

	it("returns undefined when the repository is not location aware", async () => {
		state.projectRepository = { get: jest.fn() };
		await expect(resolve()).resolves.toBeUndefined();
	});

	it("returns undefined for a project already in the cloud, without reading the repository", async () => {
		const repo = makeRepo("cloud");
		state.projectRepository = repo;
		await expect(resolve()).resolves.toBeUndefined();
		expect(repo.get).not.toHaveBeenCalled();
	});

	it("returns undefined when the id already exists locally", async () => {
		state.projectRepository = makeRepo("local", { id: "p1" });
		await expect(resolve()).resolves.toBeUndefined();
		expect(state.ui.saveLocationModalVisible).toBe(false);
	});

	it("returns the local preference without asking", async () => {
		(getPreferredSaveLocation as jest.Mock).mockReturnValue("local");
		await expect(resolve()).resolves.toBe("local");
		expect(state.ui.saveLocationModalVisible).toBe(false);
	});

	it("returns the cloud preference without asking when a user is signed in", async () => {
		(getPreferredSaveLocation as jest.Mock).mockReturnValue("cloud");
		user = { id: "u1" };
		await expect(resolve()).resolves.toBe("cloud");
		expect(state.ui.saveLocationModalVisible).toBe(false);
	});

	it("asks again when the cloud preference has no session, without overwriting the preference", async () => {
		(getPreferredSaveLocation as jest.Mock).mockReturnValue("cloud");
		const promise = resolve();
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();
		expect(state.ui.saveLocationModalVisible).toBe(true);
		state.ui.onSaveLocationChosen!("local");
		await expect(promise).resolves.toBe("local");
		expect(setPreferredSaveLocation).not.toHaveBeenCalled();
	});

	it("opens the modal when there is no preference, then stores the choice as the preference", async () => {
		const promise = resolve();
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();
		expect(state.ui.saveLocationModalVisible).toBe(true);
		state.ui.onSaveLocationChosen!("cloud");
		await expect(promise).resolves.toBe("cloud");
		expect(setPreferredSaveLocation).toHaveBeenCalledWith("cloud");
		expect(state.ui.saveLocationModalVisible).toBe(false);
		expect(state.ui.onSaveLocationChosen).toBeNull();
	});

	it("returns 'cancelled' and stores nothing when the modal is closed without choice", async () => {
		const promise = resolve();
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();
		state.ui.onSaveLocationChosen!(null);
		await expect(promise).resolves.toBe("cancelled");
		expect(setPreferredSaveLocation).not.toHaveBeenCalled();
		expect(state.ui.saveLocationModalVisible).toBe(false);
	});
});
