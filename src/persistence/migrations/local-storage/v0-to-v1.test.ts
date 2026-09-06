import { DEFAULT_PROJECT_NAME } from "@/schemas/project/project.schema";
import v0ToV1 from "./v0-to-v1";
import { PROJECTS_INDEX_KEY, projectKey } from "./keys";

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

const raw = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
	id,
	name,
	schemaVersion: 2,
	...extra,
});

describe("migration de disposition v0 → v1", () => {
	let store: Map<string, string>;

	beforeEach(() => {
		store = installLocalStorage();
	});

	it("éclate le tableau unique en une clé par projet + un index { id: { name } }", () => {
		store.set(
			PROJECTS_INDEX_KEY,
			JSON.stringify([raw("p1", "Alpha"), raw("p2", "Bravo")]),
		);

		v0ToV1.migrate();

		expect(JSON.parse(store.get(projectKey("p1"))!)).toEqual(raw("p1", "Alpha"));
		expect(JSON.parse(store.get(projectKey("p2"))!)).toEqual(raw("p2", "Bravo"));
		expect(JSON.parse(store.get(PROJECTS_INDEX_KEY)!)).toEqual({
			p1: { name: "Alpha" },
			p2: { name: "Bravo" },
		});
	});

	it("absorbe l'ancien format à double encodage JSON", () => {
		store.set(
			PROJECTS_INDEX_KEY,
			JSON.stringify([JSON.stringify(raw("p1", "Alpha"))]),
		);

		v0ToV1.migrate();

		expect(JSON.parse(store.get(projectKey("p1"))!)).toEqual(raw("p1", "Alpha"));
	});

	it("écarte les entrées sans identifiant exploitable", () => {
		store.set(
			PROJECTS_INDEX_KEY,
			JSON.stringify([{ name: "sans id" }, raw("p1", "Alpha")]),
		);

		v0ToV1.migrate();

		expect(JSON.parse(store.get(PROJECTS_INDEX_KEY)!)).toEqual({
			p1: { name: "Alpha" },
		});
	});

	it("nomme un projet au nom absent avec le nom par défaut", () => {
		store.set(PROJECTS_INDEX_KEY, JSON.stringify([{ id: "p1" }]));

		v0ToV1.migrate();

		expect(JSON.parse(store.get(PROJECTS_INDEX_KEY)!)).toEqual({
			p1: { name: DEFAULT_PROJECT_NAME },
		});
	});

	it("est sans effet si l'index est déjà un objet (ré-essai après pose de version ratée)", () => {
		store.set(projectKey("p1"), JSON.stringify(raw("p1", "Vrai contenu")));
		store.set(PROJECTS_INDEX_KEY, JSON.stringify({ p1: { name: "Vrai contenu" } }));

		v0ToV1.migrate();

		// La clé projet n'a pas été écrasée par une entrée d'index tronquée.
		expect(JSON.parse(store.get(projectKey("p1"))!)).toEqual(
			raw("p1", "Vrai contenu"),
		);
	});

	it("laisse le tableau v0 intact si l'écriture d'une clé projet échoue", () => {
		store.set(PROJECTS_INDEX_KEY, JSON.stringify([raw("p1", "Alpha")]));
		const before = store.get(PROJECTS_INDEX_KEY);
		(globalThis as any).localStorage.setItem = (k: string) => {
			if (k.startsWith("studomate_project_")) {
				throw new DOMException("quota", "QuotaExceededError");
			}
		};

		expect(() => v0ToV1.migrate()).toThrow();
		expect(store.get(PROJECTS_INDEX_KEY)).toBe(before);
	});
});
