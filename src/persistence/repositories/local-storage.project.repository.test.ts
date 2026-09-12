import Project from "@/schemas/project/project.schema";
import LocalStorageProjectRepository from "./local-storage.project.repository";
import { PROJECT_SCHEMA_VERSION } from "@/schemas/project/project.schema";
import { projectKey } from "../migrations/local-storage/keys";

const STORAGE_KEY = "studomate_projects_data";
const LAYOUT_VERSION_KEY = "studomate_local_storage_version";

/** localStorage minimal, l'environnement de test étant en `node` */
function installLocalStorage(onSet?: (key: string, value: string) => void) {
	const store = new Map<string, string>();
	const mock = {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => {
			onSet?.(k, v);
			store.set(k, v);
		},
		removeItem: (k: string) => store.delete(k),
		clear: () => store.clear(),
	};
	(globalThis as any).localStorage = mock;
	return store;
}

function legacyStoredValue(projects: object[]) {
	return JSON.stringify(projects.map((p) => JSON.stringify(p)));
}

function newProject(id: string, name: string) {
	const project = new Project(id, name, "auteur");
	return project;
}

describe("LocalStorageProjectRepository", () => {
	let store: Map<string, string>;

	beforeEach(() => {
		store = installLocalStorage();
	});

	describe("lecture d'un stockage hérité", () => {
		// Le cas réel : un projet enregistré avant le versionnement
		it("relit un projet écrit par l'ancienne version", async () => {
			const original = newProject("p1", "Projet enseignante");
			store.set(
				STORAGE_KEY,
				legacyStoredValue([JSON.parse(JSON.stringify(original))]),
			);

			const { projects } = await new LocalStorageProjectRepository().list();

			expect(projects).toHaveLength(1);
			expect(projects[0]).toBeInstanceOf(Project);
			expect(projects[0].id).toBe("p1");
			expect(projects[0].name).toBe("Projet enseignante");
		});

		it("migre vers la disposition v1 (une clé par projet + index) à la première opération", async () => {
			store.set(
				STORAGE_KEY,
				legacyStoredValue([JSON.parse(JSON.stringify(newProject("p1", "A")))]),
			);
			const repo = new LocalStorageProjectRepository();

			await repo.save(newProject("p2", "B"));

			expect(store.get(LAYOUT_VERSION_KEY)).toBe("1");
			expect(JSON.parse(store.get(STORAGE_KEY)!)).toEqual({
				p1: { name: "A" },
				p2: { name: "B" },
			});
			expect(JSON.parse(store.get(projectKey("p1"))!).name).toBe("A");
			expect(JSON.parse(store.get(projectKey("p2"))!).name).toBe("B");
		});
	});

	describe("aller-retour", () => {
		it("enregistre puis relit un projet", async () => {
			const repo = new LocalStorageProjectRepository();

			expect(await repo.save(newProject("p1", "Mon projet"))).toEqual({
				ok: true,
			});
			expect((await repo.get("p1"))?.name).toBe("Mon projet");
		});

		it("remplace un projet existant au lieu de le dupliquer", async () => {
			const repo = new LocalStorageProjectRepository();
			await repo.save(newProject("p1", "Avant"));
			await repo.save(newProject("p1", "Après"));

			expect((await repo.list()).projects).toHaveLength(1);
			expect((await repo.get("p1"))?.name).toBe("Après");
		});

		it("supprime un projet", async () => {
			const repo = new LocalStorageProjectRepository();
			await repo.save(newProject("p1", "A"));
			await repo.save(newProject("p2", "B"));

			await repo.delete("p1");

			expect((await repo.list()).projects.map((p) => p.id)).toEqual(["p2"]);
		});

		it("retourne null pour un projet inconnu", async () => {
			expect(
				await new LocalStorageProjectRepository().get("inexistant"),
			).toBeNull();
		});

		it("renvoie le projet demandé sans toucher aux autres entrées, même illisibles", async () => {
			store.set(
				STORAGE_KEY,
				JSON.stringify([
					{ name: "sans id" },
					{
						id: "futur",
						name: "V2",
						schemaVersion: PROJECT_SCHEMA_VERSION + 1,
					},
					JSON.parse(JSON.stringify(newProject("p1", "Bon"))),
				]),
			);

			const project = await new LocalStorageProjectRepository().get("p1");

			expect(project?.name).toBe("Bon");
		});
	});

	describe("échec de sauvegarde", () => {
		// L'ancien code laissait passer l'exception et affichait « enregistré »
		it("signale un dépassement de quota au lieu de lever", async () => {
			installLocalStorage(() => {
				const e = new DOMException("quota", "QuotaExceededError");
				throw e;
			});

			const result = await new LocalStorageProjectRepository().save(
				newProject("p1", "A"),
			);

			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason).toBe("quota-exceeded");
		});

		it("signale une cause inconnue sans lever", async () => {
			installLocalStorage(() => {
				throw new Error("panne");
			});

			const result = await new LocalStorageProjectRepository().save(
				newProject("p1", "A"),
			);

			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason).toBe("unknown");
		});
	});

	/**
	 * La version étant portée par chaque projet, des projets de versions différentes peuvent
	 * cohabiter — ce qui rend possible deux applications de versions différentes sur le même
	 * stockage.
	 */
	describe("cohabitation de versions", () => {
		it("ouvre les projets qu'elle comprend et ignore ceux qui la dépassent", async () => {
			store.set(
				STORAGE_KEY,
				JSON.stringify([
					JSON.parse(JSON.stringify(newProject("ancien", "Lisible"))),
					{
						id: "futur",
						name: "Écrit par une v2",
						schemaVersion: PROJECT_SCHEMA_VERSION + 1,
					},
				]),
			);

			const { projects, skipped } =
				await new LocalStorageProjectRepository().list();

			expect(projects.map((p) => p.id)).toEqual(["ancien"]);
			expect(skipped).toEqual([{ reason: "newer-version", id: "futur" }]);
		});

		it("ne réécrit pas un projet trop récent lorsqu'elle en enregistre un autre", async () => {
			const futur = {
				id: "futur",
				name: "V2",
				schemaVersion: PROJECT_SCHEMA_VERSION + 1,
				extra: 42,
			};
			store.set(STORAGE_KEY, JSON.stringify([futur]));
			const repo = new LocalStorageProjectRepository();

			await repo.save(newProject("p1", "Nouveau"));

			expect(JSON.parse(store.get(projectKey("futur"))!)).toEqual(futur);
		});
	});

	describe("validation à la lecture", () => {
		// Une entrée sans id n'est pas un projet : la migration v0 → v1 ne peut pas la ranger sous
		// une clé et l'écarte. Les rejets d'un projet identifié mais illisible restent, eux,
		// remontés par `list()` (voir « cohabitation de versions »).
		it("écarte une entrée sans identifiant valide", async () => {
			store.set(
				STORAGE_KEY,
				JSON.stringify([
					{ name: "sans id" },
					JSON.parse(JSON.stringify(newProject("p1", "Bon"))),
				]),
			);

			const { projects, skipped } =
				await new LocalStorageProjectRepository().list();

			expect(projects.map((p) => p.id)).toEqual(["p1"]);
			expect(skipped).toEqual([]);
		});

		it("ne lève pas sur un stockage corrompu", async () => {
			store.set(STORAGE_KEY, "{ ceci n'est pas du JSON");

			await expect(new LocalStorageProjectRepository().list()).resolves.toEqual(
				{ projects: [], skipped: [] },
			);
		});
	});

	describe("disposition v1 — isolation des projets", () => {
		it("un get ne lit que la clé du projet demandé", async () => {
			const repo = new LocalStorageProjectRepository();
			await repo.save(newProject("a", "A"));
			await repo.save(newProject("b", "B"));

			const reads: string[] = [];
			const realGet = (globalThis as any).localStorage.getItem;
			(globalThis as any).localStorage.getItem = (k: string) => {
				reads.push(k);
				return realGet(k);
			};
			await repo.get("b");

			expect(reads).not.toContain(projectKey("a"));
			expect(reads).toContain(projectKey("b"));
		});

		it("un save ne réécrit pas la clé des autres projets", async () => {
			const repo = new LocalStorageProjectRepository();
			await repo.save(newProject("a", "A"));
			await repo.save(newProject("b", "B"));

			const writes: string[] = [];
			const realSet = (globalThis as any).localStorage.setItem;
			(globalThis as any).localStorage.setItem = (k: string, v: string) => {
				writes.push(k);
				return realSet(k, v);
			};
			await repo.save(newProject("b", "B2"));

			expect(writes).not.toContain(projectKey("a"));
			expect(writes).toEqual(
				expect.arrayContaining([projectKey("b"), STORAGE_KEY]),
			);
		});

		it("delete retire la clé du projet et son entrée d'index", async () => {
			const repo = new LocalStorageProjectRepository();
			await repo.save(newProject("a", "A"));
			await repo.save(newProject("b", "B"));

			await repo.delete("a");

			expect(store.get(projectKey("a"))).toBeUndefined();
			expect(JSON.parse(store.get(STORAGE_KEY)!)).toEqual({ b: { name: "B" } });
		});

		it("ré-exécuter la migration après une pose de version ratée ne perd pas de données", async () => {
			const repo = new LocalStorageProjectRepository();
			await repo.save(newProject("a", "Contenu réel"));
			// Simule l'état « tout migré sauf la version » : on efface la clé de version.
			store.delete(LAYOUT_VERSION_KEY);

			const reopened = await new LocalStorageProjectRepository().get("a");

			expect(reopened?.name).toBe("Contenu réel");
			expect(store.get(LAYOUT_VERSION_KEY)).toBe("1");
		});
	});
});
