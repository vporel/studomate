import { getPagesSession, setPagesSession } from "./pages-session-storage";

/** localStorage minimal, l'environnement de test étant en `node` */
function installLocalStorage() {
	const store = new Map<string, string>();
	const mock = {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => store.set(k, v),
		removeItem: (k: string) => store.delete(k),
		clear: () => store.clear(),
	};
	(globalThis as any).localStorage = mock;
	return store;
}

describe("pages-session-storage", () => {
	let store: Map<string, string>;

	beforeEach(() => {
		store = installLocalStorage();
	});

	it("retourne null quand aucune session n'est enregistrée pour ce projet", () => {
		expect(getPagesSession("p1")).toBeNull();
	});

	it("enregistre puis relit la session d'un projet", () => {
		setPagesSession("p1", { pagesOrder: ["a", "b"], activePageId: "b" });

		expect(getPagesSession("p1")).toEqual({ pagesOrder: ["a", "b"], activePageId: "b" });
	});

	it("isole les sessions de deux projets différents", () => {
		setPagesSession("p1", { pagesOrder: ["a"], activePageId: "a" });
		setPagesSession("p2", { pagesOrder: ["x", "y"], activePageId: "x" });

		expect(getPagesSession("p1")).toEqual({ pagesOrder: ["a"], activePageId: "a" });
		expect(getPagesSession("p2")).toEqual({ pagesOrder: ["x", "y"], activePageId: "x" });
	});

	it("ne lève pas sur une entrée corrompue, et la traite comme absente", () => {
		store.set("studomate_session_pages_p1", "{ ceci n'est pas du JSON");

		expect(getPagesSession("p1")).toBeNull();
	});

	it("ne lève pas sur une entrée dont pagesOrder n'est pas un tableau", () => {
		store.set("studomate_session_pages_p1", JSON.stringify({ activePageId: "a" }));

		expect(getPagesSession("p1")).toBeNull();
	});
});
