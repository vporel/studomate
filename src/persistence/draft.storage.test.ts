import {
	saveDraft,
	getDraft,
	getAllDrafts,
	deleteDraft,
	deleteAllDrafts,
} from "./draft.storage";

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

describe("draft.storage", () => {
	beforeEach(() => {
		installLocalStorage();
	});

	describe("saveDraft / getDraft", () => {
		it("retrouve un brouillon après l'avoir enregistré", () => {
			saveDraft("p1", "Mon projet", '{"id":"p1"}');

			const draft = getDraft("p1");

			expect(draft).not.toBeNull();
			expect(draft!.projectId).toBe("p1");
			expect(draft!.projectName).toBe("Mon projet");
			expect(draft!.data).toBe('{"id":"p1"}');
		});

		it("retourne null si aucun brouillon n'existe pour ce projet", () => {
			expect(getDraft("inconnu")).toBeNull();
		});

		it("écrase le brouillon précédent pour le même projet", () => {
			saveDraft("p1", "Mon projet", '{"id":"p1","v":1}');
			saveDraft("p1", "Mon projet", '{"id":"p1","v":2}');

			expect(getDraft("p1")!.data).toBe('{"id":"p1","v":2}');
		});
	});

	describe("getAllDrafts", () => {
		it("retourne tous les brouillons enregistrés", () => {
			saveDraft("p1", "Projet 1", "{}");
			saveDraft("p2", "Projet 2", "{}");

			const drafts = getAllDrafts();

			expect(drafts).toHaveLength(2);
			expect(drafts.map((d) => d.projectId)).toEqual(
				expect.arrayContaining(["p1", "p2"]),
			);
		});

		it("retourne une liste vide s'il n'y a aucun brouillon", () => {
			expect(getAllDrafts()).toHaveLength(0);
		});

		it("trie du plus récent au plus ancien", () => {
			const now = Date.now();
			const store = new Map<string, string>();
			(globalThis as any).localStorage = {
				getItem: (k: string) => store.get(k) ?? null,
				setItem: (k: string, v: string) => store.set(k, v),
				removeItem: (k: string) => store.delete(k),
				clear: () => store.clear(),
			};
			// Insertion manuelle avec savedAt explicites
			const raw = {
				p1: {
					projectId: "p1",
					projectName: "A",
					savedAt: now - 10000,
					data: "{}",
				},
				p2: { projectId: "p2", projectName: "B", savedAt: now, data: "{}" },
			};
			store.set("studomate_drafts", JSON.stringify(raw));

			const drafts = getAllDrafts();

			expect(drafts[0].projectId).toBe("p2");
			expect(drafts[1].projectId).toBe("p1");
		});
	});

	describe("deleteDraft", () => {
		it("supprime uniquement le brouillon du projet ciblé", () => {
			saveDraft("p1", "Projet 1", "{}");
			saveDraft("p2", "Projet 2", "{}");

			deleteDraft("p1");

			expect(getDraft("p1")).toBeNull();
			expect(getDraft("p2")).not.toBeNull();
		});

		it("ne lève pas si le projet n'a pas de brouillon", () => {
			expect(() => deleteDraft("inconnu")).not.toThrow();
		});
	});

	describe("deleteAllDrafts", () => {
		it("supprime tous les brouillons", () => {
			saveDraft("p1", "Projet 1", "{}");
			saveDraft("p2", "Projet 2", "{}");

			deleteAllDrafts();

			expect(getAllDrafts()).toHaveLength(0);
		});
	});

	describe("expiration (TTL 7 jours)", () => {
		it("ignore les brouillons expirés", () => {
			const now = Date.now();
			const store = new Map<string, string>();
			(globalThis as any).localStorage = {
				getItem: (k: string) => store.get(k) ?? null,
				setItem: (k: string, v: string) => store.set(k, v),
				removeItem: (k: string) => store.delete(k),
				clear: () => store.clear(),
			};
			const expired = now - 8 * 24 * 60 * 60 * 1000; // 8 jours
			store.set(
				"studomate_drafts",
				JSON.stringify({
					p1: {
						projectId: "p1",
						projectName: "Ancien",
						savedAt: expired,
						data: "{}",
					},
				}),
			);

			expect(getDraft("p1")).toBeNull();
			expect(getAllDrafts()).toHaveLength(0);
		});

		it("conserve les brouillons dans les 7 jours", () => {
			const now = Date.now();
			const store = new Map<string, string>();
			(globalThis as any).localStorage = {
				getItem: (k: string) => store.get(k) ?? null,
				setItem: (k: string, v: string) => store.set(k, v),
				removeItem: (k: string) => store.delete(k),
				clear: () => store.clear(),
			};
			const recent = now - 6 * 24 * 60 * 60 * 1000; // 6 jours
			store.set(
				"studomate_drafts",
				JSON.stringify({
					p1: {
						projectId: "p1",
						projectName: "Récent",
						savedAt: recent,
						data: "{}",
					},
				}),
			);

			expect(getDraft("p1")).not.toBeNull();
		});
	});

	describe("robustesse", () => {
		it("retourne un store vide si le localStorage contient du JSON invalide", () => {
			const store = new Map<string, string>();
			(globalThis as any).localStorage = {
				getItem: (k: string) => store.get(k) ?? null,
				setItem: (k: string, v: string) => store.set(k, v),
				removeItem: (k: string) => store.delete(k),
				clear: () => store.clear(),
			};
			store.set("studomate_drafts", "{ pas du JSON");

			expect(() => getAllDrafts()).not.toThrow();
			expect(getAllDrafts()).toHaveLength(0);
		});
	});
});
