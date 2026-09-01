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
		update: () => resolved(result),
		delete: () => resolved(result),
		insert: () => resolved(result),
		then: (resolve: any, reject: any) =>
			Promise.resolve(result).then(resolve, reject),
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
			mockFrom.mockReturnValue(
				resolved({ data: [{ data: raw }], error: null }),
			);

			const projects = await new SupabaseProjectRepository().list();

			expect(projects).toHaveLength(1);
			expect(projects[0]).toBeInstanceOf(Project);
			expect(projects[0].id).toBe("p1");
		});

		it("retourne une liste vide en cas d'erreur réseau, sans lever", async () => {
			mockFrom.mockReturnValue(
				resolved({ data: null, error: new Error("offline") }),
			);

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

			expect(
				await new SupabaseProjectRepository().get("inexistant"),
			).toBeNull();
		});
	});

	describe("save", () => {
		it("échoue si personne n'est connecté", async () => {
			mockAuthGetUser.mockResolvedValue({ data: { user: null } });

			const result = await new SupabaseProjectRepository().save(
				newProject("p1", "A"),
			);

			expect(result).toEqual({ ok: false, reason: "network" });
		});

		it("enregistre pour l'utilisateur connecté", async () => {
			mockAuthGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
			mockFrom.mockReturnValue(resolved({ error: null }));

			const result = await new SupabaseProjectRepository().save(
				newProject("p1", "A"),
			);

			expect(result).toEqual({ ok: true });
		});

		it("signale un échec réseau au lieu de lever", async () => {
			mockAuthGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
			mockFrom.mockReturnValue(resolved({ error: new Error("offline") }));

			const result = await new SupabaseProjectRepository().save(
				newProject("p1", "A"),
			);

			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.reason).toBe("network");
		});
	});

	describe("save - concurrence optimiste (version)", () => {
		it("insère avec version 1 au premier enregistrement (jamais lu)", async () => {
			mockAuthGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
			mockFrom.mockReturnValue(resolved({ error: null }));

			const result = await new SupabaseProjectRepository().save(
				newProject("p1", "A"),
			);

			expect(result).toEqual({ ok: true });
		});

		it("enregistre par update conditionnel sur la version lue par un get précédent", async () => {
			mockAuthGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
			const raw = JSON.parse(JSON.stringify(newProject("p1", "A")));
			const repo = new SupabaseProjectRepository();
			mockFrom.mockReturnValueOnce(
				resolved({ data: { data: raw, version: 3 }, error: null }),
			);
			await repo.get("p1");

			mockFrom.mockReturnValueOnce(
				resolved({ data: [{ version: 4 }], error: null }),
			);
			const result = await repo.save(newProject("p1", "A"));

			expect(result).toEqual({ ok: true });
		});

		it("signale un conflit si la ligne existe déjà côté serveur sans avoir été lue ici (autre appareil)", async () => {
			mockAuthGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
			mockFrom.mockReturnValue(
				resolved({ error: { code: "23505", message: "duplicate key" } }),
			);

			const result = await new SupabaseProjectRepository().save(
				newProject("p1", "A"),
			);

			expect(result).toEqual({
				ok: false,
				reason: "conflict",
				cause: { code: "23505", message: "duplicate key" },
			});
		});

		it("signale un conflit si la version a changé depuis le dernier get/save", async () => {
			mockAuthGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
			const raw = JSON.parse(JSON.stringify(newProject("p1", "A")));
			const repo = new SupabaseProjectRepository();
			mockFrom.mockReturnValueOnce(
				resolved({ data: { data: raw, version: 3 }, error: null }),
			);
			await repo.get("p1");

			// L'update conditionnel (`eq("version", 3)`) ne trouve aucune ligne : un autre
			// appareil a déjà enregistré une version plus récente.
			mockFrom.mockReturnValueOnce(resolved({ data: [], error: null }));
			const result = await repo.save(newProject("p1", "A"));

			expect(result).toEqual({ ok: false, reason: "conflict" });
		});
	});

	describe("delete", () => {
		it("supprime un projet", async () => {
			mockFrom.mockReturnValue(resolved({ error: null }));

			expect(await new SupabaseProjectRepository().delete("p1")).toEqual({
				ok: true,
			});
		});

		it("signale un échec réseau au lieu de lever", async () => {
			mockFrom.mockReturnValue(resolved({ error: new Error("offline") }));

			const result = await new SupabaseProjectRepository().delete("p1");

			expect(result.ok).toBe(false);
		});
	});

	describe("getByShareToken", () => {
		it("retourne le projet associé au token", async () => {
			const raw = JSON.parse(JSON.stringify(newProject("p1", "A")));
			mockFrom
				.mockReturnValueOnce(
					resolved({ data: { project_id: "p1" }, error: null }),
				)
				.mockReturnValueOnce(resolved({ data: { data: raw }, error: null }));

			const project = await new SupabaseProjectRepository().getByShareToken(
				"tok",
			);

			expect(project?.id).toBe("p1");
		});

		it("retourne null si le token est introuvable", async () => {
			mockFrom.mockReturnValue(resolved({ data: null, error: null }));

			expect(
				await new SupabaseProjectRepository().getByShareToken("inconnu"),
			).toBeNull();
		});
	});

	describe("getShareToken", () => {
		it("retourne le token existant pour un projet", async () => {
			mockFrom.mockReturnValue(
				resolved({ data: { token: "tok123" }, error: null }),
			);

			expect(await new SupabaseProjectRepository().getShareToken("p1")).toBe(
				"tok123",
			);
		});

		it("retourne null si aucun token n'existe", async () => {
			mockFrom.mockReturnValue(resolved({ data: null, error: null }));

			expect(
				await new SupabaseProjectRepository().getShareToken("p1"),
			).toBeNull();
		});
	});

	describe("createShareToken", () => {
		it("retourne ok:true avec le token créé", async () => {
			mockFrom.mockReturnValue(resolved({ error: null }));

			const result = await new SupabaseProjectRepository().createShareToken(
				"p1",
			);

			expect(result.ok).toBe(true);
			if (result.ok) expect(typeof result.token).toBe("string");
		});

		it("retourne ok:false en cas d'erreur", async () => {
			mockFrom.mockReturnValue(resolved({ error: new Error("RLS") }));

			const result = await new SupabaseProjectRepository().createShareToken(
				"p1",
			);

			expect(result.ok).toBe(false);
		});
	});

	describe("deleteShareToken", () => {
		it("retourne ok:true si la suppression réussit", async () => {
			mockFrom.mockReturnValue(resolved({ error: null }));

			expect(
				await new SupabaseProjectRepository().deleteShareToken("p1"),
			).toEqual({ ok: true });
		});

		it("retourne ok:false en cas d'erreur réseau", async () => {
			mockFrom.mockReturnValue(resolved({ error: new Error("offline") }));

			const result = await new SupabaseProjectRepository().deleteShareToken(
				"p1",
			);

			expect(result.ok).toBe(false);
		});
	});
});
