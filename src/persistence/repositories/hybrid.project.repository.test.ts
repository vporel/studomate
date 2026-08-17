import Project from "@/schemas/project/project.schema";

const mockGetSession = jest.fn();
const mockAuthGetUser = jest.fn();
const mockFrom = jest.fn();

jest.mock("./supabase-client", () => ({
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
		delete: () => resolved(result),
		then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
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
		mockAuthGetUser.mockReset().mockResolvedValue({ data: { user: { id: "u1" } } });
		mockFrom.mockReset().mockReturnValue(resolved({ data: [], error: null }));
	});

	it("enregistre un nouveau projet en local par défaut", async () => {
		const repo = new HybridProjectRepository();

		expect(await repo.save(newProject("p1", "A"))).toEqual({ ok: true });
		expect((await repo.get("p1"))?.name).toBe("A");
	});

	it("ne mélange pas le cloud à la liste tant que personne n'est connecté", async () => {
		mockFrom.mockReturnValue(resolved({ data: [{ data: rawOf(newProject("cloud1", "C")) }], error: null }));
		const repo = new HybridProjectRepository();
		await repo.save(newProject("p1", "A"));

		expect((await repo.list()).map((p) => p.id)).toEqual(["p1"]);
	});

	it("fusionne local et cloud pour un utilisateur connecté", async () => {
		mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
		mockFrom.mockReturnValue(resolved({ data: [{ data: rawOf(newProject("cloud1", "C")) }], error: null }));
		const repo = new HybridProjectRepository();
		await repo.save(newProject("p1", "A"));

		expect((await repo.list()).map((p) => p.id).sort()).toEqual(["cloud1", "p1"]);
	});

	it("route get/save vers le cloud pour un projet déjà indexé comme tel", async () => {
		store.set(CLOUD_INDEX_KEY, JSON.stringify(["p1"]));
		mockFrom.mockReturnValue(resolved({ data: { data: rawOf(newProject("p1", "Cloud")) }, error: null }));

		const project = await new HybridProjectRepository().get("p1");

		expect(project?.name).toBe("Cloud");
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
			expect(await new LocalStorageProjectRepository().get("p1")).not.toBeNull();
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
});
