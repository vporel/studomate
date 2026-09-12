import Project, {
	PROJECT_SCHEMA_VERSION,
} from "@/schemas/project/project.schema";
import {
	deserializeProject,
	deserializeProjects,
} from "./project-deserialization";

function rawProject(id: string, name = "Projet"): Record<string, any> {
	return JSON.parse(JSON.stringify(new Project(id, name, "auteur")));
}

describe("deserializeProject", () => {
	it("reconstruit un projet lisible", () => {
		const result = deserializeProject(rawProject("p1", "Lisible"));

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.project).toBeInstanceOf(Project);
			expect(result.project.id).toBe("p1");
		}
	});

	it("refuse une entrée sans identifiant exploitable", () => {
		expect(deserializeProject({ name: "sans id" })).toEqual({
			ok: false,
			reason: "invalid-id",
			id: null,
		});
	});

	it("refuse un projet d'une version plus récente sans le réécrire", () => {
		expect(
			deserializeProject({
				id: "futur",
				name: "V+1",
				schemaVersion: PROJECT_SCHEMA_VERSION + 1,
			}),
		).toEqual({ ok: false, reason: "newer-version", id: "futur" });
	});

	it("refuse un projet dont la reconstruction échoue", () => {
		const circular: any = {
			id: "cassé",
			name: "Boucle",
			schemaVersion: PROJECT_SCHEMA_VERSION,
		};
		circular.self = circular;

		expect(deserializeProject(circular)).toMatchObject({
			ok: false,
			reason: "unreadable",
			id: "cassé",
		});
	});
});

describe("deserializeProjects", () => {
	it("sépare les projets lisibles de ceux qui sont écartés", () => {
		const { projects, skipped } = deserializeProjects([
			rawProject("ok1"),
			{ name: "sans id" },
			{
				id: "futur",
				name: "V+1",
				schemaVersion: PROJECT_SCHEMA_VERSION + 1,
			},
			rawProject("ok2"),
		]);

		expect(projects.map((p) => p.id)).toEqual(["ok1", "ok2"]);
		expect(skipped).toEqual([
			{ reason: "invalid-id", id: null },
			{ reason: "newer-version", id: "futur" },
		]);
	});
});
