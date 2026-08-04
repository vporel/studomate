import Project from "@/schemas/project/project.schema";
import LocalStorageProjectRepository from "./local-storage.project.repository";
import { PROJECT_SCHEMA_VERSION } from "@/schemas/project/project.schema";

const STORAGE_KEY = "studomate_projects_data";

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
		it("relit un projet écrit par l'ancienne version", () => {
			const original = newProject("p1", "Projet enseignante");
			store.set(STORAGE_KEY, legacyStoredValue([JSON.parse(JSON.stringify(original))]));

			const projects = new LocalStorageProjectRepository().list();

			expect(projects).toHaveLength(1);
			expect(projects[0]).toBeInstanceOf(Project);
			expect(projects[0].id).toBe("p1");
			expect(projects[0].name).toBe("Projet enseignante");
		});

		it("écrit la disposition courante lors du prochain enregistrement", () => {
			store.set(STORAGE_KEY, legacyStoredValue([JSON.parse(JSON.stringify(newProject("p1", "A")))]));
			const repo = new LocalStorageProjectRepository();

			repo.save(newProject("p2", "B"));

			const persisted = JSON.parse(store.get(STORAGE_KEY)!);
			expect(Array.isArray(persisted)).toBe(true);
			expect(typeof persisted[0]).toBe("object"); // plus une chaîne
		});
	});

	describe("aller-retour", () => {
		it("enregistre puis relit un projet", () => {
			const repo = new LocalStorageProjectRepository();

			expect(repo.save(newProject("p1", "Mon projet"))).toEqual({ ok: true });
			expect(repo.get("p1")?.name).toBe("Mon projet");
		});

		it("remplace un projet existant au lieu de le dupliquer", () => {
			const repo = new LocalStorageProjectRepository();
			repo.save(newProject("p1", "Avant"));
			repo.save(newProject("p1", "Après"));

			expect(repo.list()).toHaveLength(1);
			expect(repo.get("p1")?.name).toBe("Après");
		});

		it("supprime un projet", () => {
			const repo = new LocalStorageProjectRepository();
			repo.save(newProject("p1", "A"));
			repo.save(newProject("p2", "B"));

			repo.delete("p1");

			expect(repo.list().map((p) => p.id)).toEqual(["p2"]);
		});

		it("retourne null pour un projet inconnu", () => {
			expect(new LocalStorageProjectRepository().get("inexistant")).toBeNull();
		});
	});

	describe("échec de sauvegarde", () => {
		// L'ancien code laissait passer l'exception et affichait « enregistré »
		it("signale un dépassement de quota au lieu de lever", () => {
			installLocalStorage(() => {
				const e = new DOMException("quota", "QuotaExceededError");
				throw e;
			});

			const result = new LocalStorageProjectRepository().save(newProject("p1", "A"));

			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason).toBe("quota-exceeded");
		});

		it("signale une cause inconnue sans lever", () => {
			installLocalStorage(() => {
				throw new Error("panne");
			});

			const result = new LocalStorageProjectRepository().save(newProject("p1", "A"));

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
		it("ouvre les projets qu'elle comprend et ignore ceux qui la dépassent", () => {
			store.set(
				STORAGE_KEY,
				JSON.stringify([
					JSON.parse(JSON.stringify(newProject("ancien", "Lisible"))),
					{ id: "futur", name: "Écrit par une v2", schemaVersion: PROJECT_SCHEMA_VERSION + 1 },
				]),
			);

			const projects = new LocalStorageProjectRepository().list();

			expect(projects.map((p) => p.id)).toEqual(["ancien"]);
		});

		it("ne réécrit pas un projet trop récent lorsqu'elle en enregistre un autre", () => {
			const futur = { id: "futur", name: "V2", schemaVersion: PROJECT_SCHEMA_VERSION + 1, extra: 42 };
			store.set(STORAGE_KEY, JSON.stringify([futur]));
			const repo = new LocalStorageProjectRepository();

			repo.save(newProject("p1", "Nouveau"));

			const persisted = JSON.parse(store.get(STORAGE_KEY)!);
			expect(persisted.find((p: any) => p.id === "futur")).toEqual(futur);
		});
	});

	describe("validation à la lecture", () => {
		it("ignore une entrée sans identifiant valide", () => {
			store.set(
				STORAGE_KEY,
				JSON.stringify([{ name: "sans id" }, JSON.parse(JSON.stringify(newProject("p1", "Bon")))]),
			);

			const projects = new LocalStorageProjectRepository().list();

			expect(projects.map((p) => p.id)).toEqual(["p1"]);
		});

		it("ne lève pas sur un stockage corrompu", () => {
			store.set(STORAGE_KEY, "{ ceci n'est pas du JSON");

			expect(() => new LocalStorageProjectRepository().list()).not.toThrow();
			expect(new LocalStorageProjectRepository().list()).toEqual([]);
		});
	});
});
