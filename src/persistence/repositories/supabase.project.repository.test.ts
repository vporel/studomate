import Project from "@/schemas/project/project.schema";

const mockAuthGetUser = jest.fn();
const mockFrom = jest.fn();

jest.mock("./supabase-client", () => ({
	supabase: {
		auth: { getUser: (...args: any[]) => mockAuthGetUser(...args) },
		from: (...args: any[]) => mockFrom(...args),
	},
}));

import SupabaseProjectRepository from "./supabase.project.repository";

function newProject(id: string, name: string) {
	return new Project(id, name, "auteur");
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

describe("SupabaseProjectRepository", () => {
	beforeEach(() => {
		mockAuthGetUser.mockReset();
		mockFrom.mockReset();
	});

	describe("list", () => {
		it("migre et retourne les projets lisibles", async () => {
			const raw = JSON.parse(JSON.stringify(newProject("p1", "A")));
			mockFrom.mockReturnValue(resolved({ data: [{ data: raw }], error: null }));

			const projects = await new SupabaseProjectRepository().list();

			expect(projects).toHaveLength(1);
			expect(projects[0]).toBeInstanceOf(Project);
			expect(projects[0].id).toBe("p1");
		});

		it("retourne une liste vide en cas d'erreur réseau, sans lever", async () => {
			mockFrom.mockReturnValue(resolved({ data: null, error: new Error("offline") }));

			await expect(new SupabaseProjectRepository().list()).resolves.toEqual([]);
		});
	});

	describe("get", () => {
		it("relit un projet par id", async () => {
			const raw = JSON.parse(JSON.stringify(newProject("p1", "A")));
			mockFrom.mockReturnValue(resolved({ data: { data: raw }, error: null }));

			expect((await new SupabaseProjectRepository().get("p1"))?.id).toBe("p1");
		});

		it("retourne null pour un projet absent", async () => {
			mockFrom.mockReturnValue(resolved({ data: null, error: null }));

			expect(await new SupabaseProjectRepository().get("inexistant")).toBeNull();
		});
	});

	describe("save", () => {
		it("échoue si personne n'est connecté", async () => {
			mockAuthGetUser.mockResolvedValue({ data: { user: null } });

			const result = await new SupabaseProjectRepository().save(newProject("p1", "A"));

			expect(result).toEqual({ ok: false, reason: "network" });
		});

		it("enregistre pour l'utilisateur connecté", async () => {
			mockAuthGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
			mockFrom.mockReturnValue(resolved({ error: null }));

			const result = await new SupabaseProjectRepository().save(newProject("p1", "A"));

			expect(result).toEqual({ ok: true });
		});

		it("signale un échec réseau au lieu de lever", async () => {
			mockAuthGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
			mockFrom.mockReturnValue(resolved({ error: new Error("offline") }));

			const result = await new SupabaseProjectRepository().save(newProject("p1", "A"));

			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason).toBe("network");
		});
	});

	describe("delete", () => {
		it("supprime un projet", async () => {
			mockFrom.mockReturnValue(resolved({ error: null }));

			expect(await new SupabaseProjectRepository().delete("p1")).toEqual({ ok: true });
		});

		it("signale un échec réseau au lieu de lever", async () => {
			mockFrom.mockReturnValue(resolved({ error: new Error("offline") }));

			const result = await new SupabaseProjectRepository().delete("p1");

			expect(result.ok).toBe(false);
		});
	});
});
