import { Dialect } from "@/expression-language/dialect.enum";
import {
	getDefaultDialect,
	setDefaultDialect,
} from "@/persistence/preferences.storage";
import type { ProjectStoreEnvironment } from "./environment/project-store-environment";
import type { ProjectStoreSetFunction } from "./project.store.types";
import resolveDefaultDialect from "./default-dialect";

jest.mock("@/persistence/preferences.storage", () => ({
	getDefaultDialect: jest.fn(),
	setDefaultDialect: jest.fn(),
}));

type FakeState = {
	ui: {
		defaultDialectModalVisible: boolean;
		onDefaultDialectChosen: ((dialect: Dialect | null) => void) | null;
	};
};

describe("resolveDefaultDialect", () => {
	let state: FakeState;
	let set: ProjectStoreSetFunction;
	let locale: string;
	let env: ProjectStoreEnvironment;

	beforeEach(() => {
		jest.clearAllMocks();
		state = {
			ui: { defaultDialectModalVisible: false, onDefaultDialectChosen: null },
		};
		set = ((partial: unknown) => {
			const update =
				typeof partial === "function"
					? (partial as (s: FakeState) => Partial<FakeState>)(state)
					: (partial as Partial<FakeState>);
			state = { ...state, ...update };
		}) as unknown as ProjectStoreSetFunction;
		locale = "fr";
		env = {
			persistence: {},
			getLocale: () => locale,
		} as unknown as ProjectStoreEnvironment;
		(getDefaultDialect as jest.Mock).mockReturnValue(null);
	});

	it("returns undefined without persistence (embedded block)", async () => {
		env = {} as ProjectStoreEnvironment;
		await expect(resolveDefaultDialect(set, env)).resolves.toBeUndefined();
		expect(state.ui.defaultDialectModalVisible).toBe(false);
	});

	it("returns the stored preference without asking", async () => {
		(getDefaultDialect as jest.Mock).mockReturnValue(Dialect.EN);
		await expect(resolveDefaultDialect(set, env)).resolves.toBe(Dialect.EN);
		expect(state.ui.defaultDialectModalVisible).toBe(false);
	});

	it("opens the modal, stores the chosen dialect and returns it", async () => {
		const promise = resolveDefaultDialect(set, env);
		expect(state.ui.defaultDialectModalVisible).toBe(true);
		state.ui.onDefaultDialectChosen!(Dialect.EN);
		await expect(promise).resolves.toBe(Dialect.EN);
		expect(setDefaultDialect).toHaveBeenCalledWith(Dialect.EN);
		expect(state.ui.defaultDialectModalVisible).toBe(false);
		expect(state.ui.onDefaultDialectChosen).toBeNull();
	});

	it("returns the dialect of the locale without storing it when the modal is dismissed", async () => {
		locale = "en";
		const promise = resolveDefaultDialect(set, env);
		state.ui.onDefaultDialectChosen!(null);
		await expect(promise).resolves.toBe(Dialect.EN);
		expect(setDefaultDialect).not.toHaveBeenCalled();
	});

	it("falls back to the French dialect for the French locale when dismissed", async () => {
		const promise = resolveDefaultDialect(set, env);
		state.ui.onDefaultDialectChosen!(null);
		await expect(promise).resolves.toBe(Dialect.FR);
	});
});
