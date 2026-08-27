import { PROJECT_SCHEMA_VERSION } from "@/schemas/project/project.schema";
import { ProjectMigration, UNVERSIONED } from "./migration";
import { isFromNewerVersion, migrateProject } from "./index";

describe("migrateProject", () => {
	it("amène un projet non versionné à la version courante", () => {
		const ancien = { id: "p1", name: "A", grafcets: { g1: { id: "g1" } } };

		const { project, from } = migrateProject(ancien) as {
			project: any;
			from: number;
		};

		expect(from).toBe(UNVERSIONED);
		expect(project.schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
		expect(project.programs.g1).toEqual({ id: "g1", type: "grafcet" });
		expect(project.grafcets).toBeUndefined();
		expect(project.hmiPages).toEqual({});
	});

	it("déplace les dimensions des éléments GRAFCET de `data` vers `size`", () => {
		const ancien = {
			id: "p1",
			name: "A",
			grafcets: {
				g1: {
					id: "g1",
					steps: [
						{
							id: "s1",
							data: { number: 1, width: 40, height: 40 },
							position: { x: 0, y: 0 },
						},
					],
				},
			},
		};

		const { project } = migrateProject(ancien) as {
			project: any;
			from: number;
		};

		const step = Object.values((project.programs.g1 as any).steps)[0] as any;
		expect(step.data).toEqual({ number: 1 });
		expect(step.size).toEqual({ width: 40, height: 40 });
	});

	it("ajoute un programme Main si aucun n'existe déjà", () => {
		const ancien = { id: "p1", name: "A", grafcets: { g1: { id: "g1" } } };

		const { project } = migrateProject(ancien) as {
			project: any;
			from: number;
		};

		const mains = Object.values(project.programs as Record<string, any>).filter(
			(p: any) => p.type === "ladder" && p.role === "main",
		);
		expect(mains).toHaveLength(1);
		expect(project.hmiPages).toEqual({});
	});

	it("n'ajoute pas de second Main si un programme Main existe déjà", () => {
		const ancien = {
			id: "p1",
			name: "A",
			programs: {
				m1: { id: "m1", type: "ladder", role: "main", sections: [] },
			},
		};

		const { project } = migrateProject(ancien) as {
			project: any;
			from: number;
		};

		const mains = Object.values(project.programs as Record<string, any>).filter(
			(p: any) => p.type === "ladder" && p.role === "main",
		);
		expect(mains).toHaveLength(1);
	});

	it("laisse intact un projet déjà à jour", () => {
		const aJour = {
			schemaVersion: PROJECT_SCHEMA_VERSION,
			id: "p1",
			programs: { g1: { id: "g1", type: "grafcet" } },
		};

		const { project, from } = migrateProject(aJour) as {
			project: any;
			from: number;
		};

		expect(from).toBe(PROJECT_SCHEMA_VERSION);
		expect(project).toEqual(aJour);
	});

	it("ne rejoue pas une migration sur des données à jour", () => {
		const aJour = {
			schemaVersion: PROJECT_SCHEMA_VERSION,
			id: "p1",
			programs: {},
		};

		expect((migrateProject(aJour).project as any).programs).toEqual({});
	});

	describe("enchaînement de plusieurs migrations", () => {
		const bump = (target: number): ProjectMigration => ({
			from: target - 1,
			description: `v${target - 1} → v${target}`,
			migrate: (project) => ({ ...project, schemaVersion: target }),
		});

		it("applique toutes les migrations dont le point de départ est atteint", () => {
			const ancien = { id: "p1" };

			const { project, from } = migrateProject(ancien, [bump(1), bump(2)]) as {
				project: any;
				from: number;
			};

			expect(from).toBe(UNVERSIONED);
			expect(project.schemaVersion).toBe(2);
		});

		it("ne déclenche que les migrations postérieures à la version du projet", () => {
			const dejaV1 = { id: "p1", schemaVersion: 1 };

			const { project } = migrateProject(dejaV1, [bump(1), bump(2)]) as {
				project: any;
			};

			expect(project.schemaVersion).toBe(2);
		});

		it("lève si une migration ne fait pas progresser schemaVersion", () => {
			const stagnante: ProjectMigration = {
				from: UNVERSIONED,
				description: "oublie de poser schemaVersion",
				migrate: (project) => ({ ...project }),
			};

			expect(() => migrateProject({ id: "p1" }, [stagnante])).toThrow(
				/n'a pas progressé/,
			);
		});
	});
});

/**
 * La version étant portée par chaque projet, deux applications de versions différentes
 * peuvent partager le même stockage : chacune reconnaît ce qui la dépasse.
 */
describe("isFromNewerVersion", () => {
	it("reconnaît un projet écrit par une version plus récente", () => {
		expect(
			isFromNewerVersion({
				id: "p1",
				schemaVersion: PROJECT_SCHEMA_VERSION + 1,
			}),
		).toBe(true);
	});

	it("accepte un projet de la version courante", () => {
		expect(
			isFromNewerVersion({ id: "p1", schemaVersion: PROJECT_SCHEMA_VERSION }),
		).toBe(false);
	});

	it("accepte un projet plus ancien", () => {
		expect(isFromNewerVersion({ id: "p1" })).toBe(false);
	});
});
