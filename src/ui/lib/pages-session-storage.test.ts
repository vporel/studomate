import {
	clearPagesSession,
	getPagesSession,
	setPagesSession,
} from "./pages-session-storage";

/** localStorage minimal énumérable, l'environnement de test étant en `node` */
function installLocalStorage() {
	const store = new Map<string, string>();
	const mock = {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => store.set(k, v),
		removeItem: (k: string) => store.delete(k),
		clear: () => store.clear(),
		get length() {
			return store.size;
		},
		key: (i: number) => [...store.keys()][i] ?? null,
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

		expect(getPagesSession("p1")).toEqual({
			pagesOrder: ["a", "b"],
			activePageId: "b",
		});
	});

	it("stocke tout dans une seule clé", () => {
		setPagesSession("p1", { pagesOrder: ["a"], activePageId: "a" });
		setPagesSession("p2", { pagesOrder: ["b"], activePageId: "b" });

		expect([...store.keys()]).toEqual(["studomate_session_pages"]);
	});

	it("isole les sessions de deux projets différents", () => {
		setPagesSession("p1", { pagesOrder: ["a"], activePageId: "a" });
		setPagesSession("p2", { pagesOrder: ["x", "y"], activePageId: "x" });

		expect(getPagesSession("p1")).toEqual({
			pagesOrder: ["a"],
			activePageId: "a",
		});
		expect(getPagesSession("p2")).toEqual({
			pagesOrder: ["x", "y"],
			activePageId: "x",
		});
	});

	it("ne lève pas sur un objet corrompu, et le traite comme vide", () => {
		store.set("studomate_session_pages", "{ ceci n'est pas du JSON");

		expect(getPagesSession("p1")).toBeNull();
	});

	it("ignore une entrée dont pagesOrder n'est pas un tableau", () => {
		store.set(
			"studomate_session_pages",
			JSON.stringify({ p1: { activePageId: "a" } }),
		);

		expect(getPagesSession("p1")).toBeNull();
	});

	it("plafonne le nombre de sessions en évinçant les moins récemment écrites", () => {
		let now = 1_000;
		const spy = jest.spyOn(Date, "now").mockImplementation(() => (now += 1));
		for (let i = 0; i < 45; i++) {
			setPagesSession(`p${i}`, { pagesOrder: ["a"], activePageId: "a" });
		}
		spy.mockRestore();

		const map = JSON.parse(store.get("studomate_session_pages")!);
		expect(Object.keys(map)).toHaveLength(40);
		expect(getPagesSession("p0")).toBeNull();
		expect(getPagesSession("p44")).not.toBeNull();
	});

	it("réécrire une session la garde parmi les plus récentes", () => {
		let now = 1_000;
		const spy = jest.spyOn(Date, "now").mockImplementation(() => (now += 1));
		setPagesSession("keep", { pagesOrder: ["a"], activePageId: "a" });
		for (let i = 0; i < 45; i++) {
			setPagesSession(`p${i}`, { pagesOrder: ["a"], activePageId: "a" });
			setPagesSession("keep", { pagesOrder: ["a"], activePageId: "a" });
		}
		spy.mockRestore();

		expect(getPagesSession("keep")).not.toBeNull();
	});

	it("clearPagesSession supprime l'entrée du projet et garde les autres", () => {
		setPagesSession("p1", { pagesOrder: ["a"], activePageId: "a" });
		setPagesSession("p2", { pagesOrder: ["b"], activePageId: "b" });

		clearPagesSession("p1");

		expect(getPagesSession("p1")).toBeNull();
		expect(getPagesSession("p2")).not.toBeNull();
	});
});
