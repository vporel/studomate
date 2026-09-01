import Project from "@/schemas/project/project.schema";

const mockGetSession = jest.fn();
const mockAuthGetUser = jest.fn();
const mockFrom = jest.fn();

jest.mock("./supabase-client", () => ({
	isSupabaseConfigured: true,
	supabase: {
		auth: {
			getSession: (...args: any[]) => mockGetSession(...args),
			getUser: (...args: any[]) => mockAuthGetUser(...args),
		},
		from: (...args: any[]) => mockFrom(...args),
	},
}));

import HybridProjectRepository from "./hybrid.project.repository";
import LocalStorageProjectRepository from "./local-storage.project.repository";
import { isShareable } from "./project.repository";

const CLOUD_INDEX_KEY = "studomate_cloud_project_ids";

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

/** Imite le query builder Supabase (thenable, chaînable) pour un résultat donné */
function resolved(result: { data?: any; error?: any }) {
	const builder: any = {
		select: () => resolved(result),
		eq: () => resolved(result),
		maybeSingle: () => resolved(result),
		upsert: () => resolved(result),
		update: () => resolved(result),
		insert: () => resolved(result),
		delete: () => resolved(result),
		then: (resolve: any, reject: any) =>
			Promise.resolve(result).then(resolve, reject),
	};
	return builder;
}

function newProject(id: string, name: string) {
	return new Project(id, name, "auteur");
}

function rawOf(project: Project) {
	return JSON.parse(JSON.stringify(project));
}

describe("HybridProjectRepository", () => {
	let store: Map<string, string>;

	beforeEach(() => {
		store = installLocalStorage();
		mockGetSession.mockReset().mockResolvedValue({ data: { session: null } });
		mockAuthGetUser
			.mockReset()
			.mockResolvedValue({ data: { user: { id: "u1" } } });
		mockFrom.mockReset().mockReturnValue(resolved({ data: [], error: null }));
	});

	it("enregistre un nouveau projet en local par défaut", async () => {
		const repo = new HybridProjectRepository();

		expect(await repo.save(newProject("p1", "A"))).toEqual({ ok: true });
		expect((await repo.get("p1"))?.name).toBe("A");
	});

	it("ne mélange pas le cloud à la liste tant que personne n'est connecté", async () => {
		mockFrom.mockReturnValue(
			resolved({
				data: [{ data: rawOf(newProject("cloud1", "C")) }],
				error: null,
			}),
		);
		const repo = new HybridProjectRepository();
		await repo.save(newProject("p1", "A"));

		expect((await repo.list()).map((p) => p.id)).toEqual(["p1"]);
	});

	it("fusionne local et cloud pour un utilisateur connecté", async () => {
		mockGetSession.mockResolvedValue({
			data: { session: { user: { id: "u1" } } },
		});
		mockFrom.mockReturnValue(
			resolved({
				data: [{ data: rawOf(newProject("cloud1", "C")) }],
				error: null,
			}),
		);
		const repo = new HybridProjectRepository();
		await repo.save(newProject("p1", "A"));

		expect((await repo.list()).map((p) => p.id).sort()).toEqual([
			"cloud1",
			"p1",
		]);
	});

	it("route get/save vers le cloud pour un projet déjà indexé comme tel", async () => {
		store.set(CLOUD_INDEX_KEY, JSON.stringify(["p1"]));
		mockFrom.mockReturnValue(
			resolved({
				data: { data: rawOf(newProject("p1", "Cloud")) },
				error: null,
			}),
		);

		const project = await new HybridProjectRepository().get("p1");

		expect(project?.name).toBe("Cloud");
	});

	describe("save avec un lieu forcé", () => {
		it('save(project, "cloud") enregistre dans le cloud un projet encore inconnu', async () => {
			mockFrom.mockReturnValue(resolved({ error: null }));
			const repo = new HybridProjectRepository();

			const result = await repo.save(newProject("p1", "A"), "cloud");

			expect(result).toEqual({ ok: true });
			expect(JSON.parse(store.get(CLOUD_INDEX_KEY)!)).toEqual(["p1"]);
			expect(await new LocalStorageProjectRepository().get("p1")).toBeNull();
		});

		it('save(project, "local") est équivalent au comportement par défaut', async () => {
			const repo = new HybridProjectRepository();

			const result = await repo.save(newProject("p1", "A"), "local");

			expect(result).toEqual({ ok: true });
			expect((await new LocalStorageProjectRepository().get("p1"))?.name).toBe(
				"A",
			);
		});

		it('"cloud" est ignoré pour un projet déjà local : il reste local', async () => {
			const repo = new HybridProjectRepository();
			await repo.save(newProject("p1", "A"));

			const result = await repo.save(newProject("p1", "A modifié"), "cloud");

			expect(result).toEqual({ ok: true });
			expect((await new LocalStorageProjectRepository().get("p1"))?.name).toBe(
				"A modifié",
			);
			expect(store.get(CLOUD_INDEX_KEY)).toBeUndefined();
		});

		it('"local" est ignoré pour un projet déjà indexé comme cloud : il reste cloud', async () => {
			store.set(CLOUD_INDEX_KEY, JSON.stringify(["p1"]));
			mockFrom.mockReturnValue(resolved({ error: null }));
			const repo = new HybridProjectRepository();

			const result = await repo.save(newProject("p1", "A"), "local");

			expect(result).toEqual({ ok: true });
			expect(await new LocalStorageProjectRepository().get("p1")).toBeNull();
		});
	});

	describe("moveToCloud", () => {
		it("envoie le projet au cloud et le retire du local", async () => {
			mockFrom.mockReturnValue(resolved({ error: null }));
			const repo = new HybridProjectRepository();
			const project = newProject("p1", "A");
			await repo.save(project);

			const result = await repo.moveToCloud(project);

			expect(result).toEqual({ ok: true });
			expect(JSON.parse(store.get(CLOUD_INDEX_KEY)!)).toEqual(["p1"]);
			expect(await new LocalStorageProjectRepository().get("p1")).toBeNull();
		});

		it("ne touche pas au local si l'envoi cloud échoue", async () => {
			mockAuthGetUser.mockResolvedValue({ data: { user: null } });
			const repo = new HybridProjectRepository();
			const project = newProject("p1", "A");
			await repo.save(project);

			const result = await repo.moveToCloud(project);

			expect(result.ok).toBe(false);
			expect(
				await new LocalStorageProjectRepository().get("p1"),
			).not.toBeNull();
		});

		it("réussit et n'introduit pas de doublon si le nettoyage local échoue", async () => {
			mockGetSession.mockResolvedValue({
				data: { session: { user: { id: "u1" } } },
			});
			mockFrom.mockReturnValue(
				resolved({
					data: [{ data: rawOf(newProject("p1", "A")) }],
					error: null,
				}),
			);
			const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
			const repo = new HybridProjectRepository();
			const project = newProject("p1", "A");
			await repo.save(project);

			// La suppression locale (write sur STORAGE_KEY) échoue ; l'index cloud reste modifiable.
			const realSetItem = (globalThis as any).localStorage.setItem;
			(globalThis as any).localStorage.setItem = (k: string, v: string) => {
				if (k === "studomate_projects_data") throw new Error("quota");
				realSetItem(k, v);
			};

			const result = await repo.moveToCloud(project);
			(globalThis as any).localStorage.setItem = realSetItem;

			expect(result).toEqual({ ok: true });
			expect((await repo.list()).map((p) => p.id)).toEqual(["p1"]);
			expect(warn).toHaveBeenCalled();
			warn.mockRestore();
		});

		it("échoue sans supprimer le local si l'index ne peut pas être écrit", async () => {
			mockFrom.mockReturnValue(resolved({ error: null }));
			const error = jest.spyOn(console, "error").mockImplementation(() => {});
			const repo = new HybridProjectRepository();
			const project = newProject("p1", "A");
			await repo.save(project);

			const realSetItem = (globalThis as any).localStorage.setItem;
			(globalThis as any).localStorage.setItem = (k: string, v: string) => {
				if (k === CLOUD_INDEX_KEY) throw new Error("quota");
				realSetItem(k, v);
			};

			const result = await repo.moveToCloud(project);
			(globalThis as any).localStorage.setItem = realSetItem;

			expect(result).toEqual({ ok: false, reason: "unavailable" });
			expect(
				await new LocalStorageProjectRepository().get("p1"),
			).not.toBeNull();
			error.mockRestore();
		});
	});

	describe("moveToLocal", () => {
		it("réussit et n'introduit pas de doublon si la suppression cloud échoue", async () => {
			mockGetSession.mockResolvedValue({
				data: { session: { user: { id: "u1" } } },
			});
			store.set(CLOUD_INDEX_KEY, JSON.stringify(["p1"]));
			const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
			const error = jest.spyOn(console, "error").mockImplementation(() => {});
			// save local OK, mais la suppression cloud renvoie une erreur ; list() cloud ne renvoie rien
			mockFrom.mockReturnValue(
				resolved({ data: [], error: { message: "boom" } }),
			);
			const repo = new HybridProjectRepository();

			const result = await repo.moveToLocal(newProject("p1", "A"));

			expect(result).toEqual({ ok: true });
			expect((await repo.list()).map((p) => p.id)).toEqual(["p1"]);
			expect(warn).toHaveBeenCalled();
			warn.mockRestore();
			error.mockRestore();
		});

		it("échoue sans supprimer le cloud si l'index ne peut pas être écrit", async () => {
			mockGetSession.mockResolvedValue({
				data: { session: { user: { id: "u1" } } },
			});
			store.set(CLOUD_INDEX_KEY, JSON.stringify(["p1"]));
			const error = jest.spyOn(console, "error").mockImplementation(() => {});
			const deleteSpy = jest.fn(() => resolved({ data: [], error: null }));
			mockFrom.mockReturnValue({
				...resolved({ data: [], error: null }),
				delete: deleteSpy,
			});
			const repo = new HybridProjectRepository();

			const realSetItem = (globalThis as any).localStorage.setItem;
			(globalThis as any).localStorage.setItem = (k: string, v: string) => {
				if (k === CLOUD_INDEX_KEY) throw new Error("quota");
				realSetItem(k, v);
			};

			const result = await repo.moveToLocal(newProject("p1", "A"));
			(globalThis as any).localStorage.setItem = realSetItem;

			expect(result).toEqual({ ok: false, reason: "unavailable" });
			expect(deleteSpy).not.toHaveBeenCalled();
			expect(JSON.parse(store.get(CLOUD_INDEX_KEY)!)).toEqual(["p1"]);
			error.mockRestore();
		});
	});

	describe("list", () => {
		it("écarte du volet local un projet présent dans l'index cloud", async () => {
			mockGetSession.mockResolvedValue({
				data: { session: { user: { id: "u1" } } },
			});
			mockFrom.mockReturnValue(
				resolved({
					data: [{ data: rawOf(newProject("p1", "A")) }],
					error: null,
				}),
			);
			const repo = new HybridProjectRepository();
			await repo.save(newProject("p1", "A")); // encore présent en local
			store.set(CLOUD_INDEX_KEY, JSON.stringify(["p1"]));

			expect((await repo.list()).map((p) => p.id)).toEqual(["p1"]);
		});
	});

	describe("delete", () => {
		it("supprime un projet local et le retire de l'index", async () => {
			const repo = new HybridProjectRepository();
			await repo.save(newProject("p1", "A"));

			expect(await repo.delete("p1")).toEqual({ ok: true });
			expect(await repo.get("p1")).toBeNull();
		});
	});

	describe("partage (délégué au cloud)", () => {
		it("est reconnu comme ShareableProjectRepository", () => {
			expect(isShareable(new HybridProjectRepository())).toBe(true);
		});

		it("createShareToken insère une ligne de partage et renvoie le token", async () => {
			mockFrom.mockReturnValue({
				insert: () => Promise.resolve({ error: null }),
			});
			const result = await new HybridProjectRepository().createShareToken("p1");

			expect(result.ok).toBe(true);
			expect(mockFrom).toHaveBeenCalledWith("project_shares");
		});

		it("getShareToken renvoie le token existant", async () => {
			mockFrom.mockReturnValue(
				resolved({ data: { token: "tok-1" }, error: null }),
			);

			expect(await new HybridProjectRepository().getShareToken("p1")).toBe(
				"tok-1",
			);
		});

		it("deleteShareToken supprime la ligne de partage", async () => {
			mockFrom.mockReturnValue(resolved({ error: null }));

			expect(
				await new HybridProjectRepository().deleteShareToken("p1"),
			).toEqual({ ok: true });
		});
	});
});
