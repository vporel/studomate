import {
	ensureLocalStorageLayout,
	readLayoutVersion,
} from "./index";
import { LayoutMigration } from "./layout-migration";
import { LOCAL_STORAGE_LAYOUT_VERSION_KEY } from "./keys";

function installLocalStorage() {
	const store = new Map<string, string>();
	(globalThis as any).localStorage = {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => store.set(k, v),
		removeItem: (k: string) => store.delete(k),
		clear: () => store.clear(),
	};
	return store;
}

describe("readLayoutVersion", () => {
	beforeEach(() => installLocalStorage());

	it("retourne 0 quand la clé est absente (utilisateur d'avant le versionnement)", () => {
		expect(readLayoutVersion()).toBe(0);
	});

	it("relit un entier posé", () => {
		localStorage.setItem(LOCAL_STORAGE_LAYOUT_VERSION_KEY, "1");
		expect(readLayoutVersion()).toBe(1);
	});

	it("retombe sur 0 devant une valeur non entière", () => {
		localStorage.setItem(LOCAL_STORAGE_LAYOUT_VERSION_KEY, "abc");
		expect(readLayoutVersion()).toBe(0);
	});
});

describe("ensureLocalStorageLayout", () => {
	beforeEach(() => installLocalStorage());

	it("applique les migrations manquantes en chaîne et pose la version atteinte", () => {
		const calls: number[] = [];
		const migrations: LayoutMigration[] = [
			{ from: 0, description: "", migrate: () => calls.push(0) },
			{ from: 1, description: "", migrate: () => calls.push(1) },
		];

		const version = ensureLocalStorageLayout(migrations);

		expect(calls).toEqual([0, 1]);
		expect(version).toBe(2);
		expect(readLayoutVersion()).toBe(2);
	});

	it("ne fait rien quand la disposition est déjà à jour", () => {
		localStorage.setItem(LOCAL_STORAGE_LAYOUT_VERSION_KEY, "1");
		const migrate = jest.fn();

		ensureLocalStorageLayout([{ from: 0, description: "", migrate }]);

		expect(migrate).not.toHaveBeenCalled();
	});

	it("n'avance pas la version si une migration lève", () => {
		const migrations: LayoutMigration[] = [
			{
				from: 0,
				description: "",
				migrate: () => {
					throw new Error("quota");
				},
			},
		];

		expect(ensureLocalStorageLayout(migrations)).toBe(0);
		expect(readLayoutVersion()).toBe(0);
	});
});
