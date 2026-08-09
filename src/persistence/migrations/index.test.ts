import { PROJECT_SCHEMA_VERSION } from "@/schemas/project/project.schema";
import { UNVERSIONED } from "./migration";
import { isFromNewerVersion, migrateProject } from "./index";

describe("migrateProject", () => {
	it("amène un projet non versionné à la version courante", () => {
		const ancien = { id: "p1", name: "A", grafcets: { g1: { id: "g1" } } };

		const { project, from } = migrateProject(ancien);

		expect(from).toBe(UNVERSIONED);
		expect(project.schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
		expect(project.programs).toEqual({ g1: { id: "g1", type: "grafcet" } });
		expect(project.grafcets).toBeUndefined();
	});

	it("laisse intact un projet déjà à jour", () => {
		const aJour = {
			schemaVersion: PROJECT_SCHEMA_VERSION,
			id: "p1",
			programs: { g1: { id: "g1", type: "grafcet" } },
		};

		const { project, from } = migrateProject(aJour);

		expect(from).toBe(PROJECT_SCHEMA_VERSION);
		expect(project).toEqual(aJour);
	});

	it("ne rejoue pas une migration sur des données à jour", () => {
		const aJour = { schemaVersion: PROJECT_SCHEMA_VERSION, id: "p1", programs: {} };

		expect(migrateProject(aJour).project.programs).toEqual({});
	});
});

/**
 * La version étant portée par chaque projet, deux applications de versions différentes
 * peuvent partager le même stockage : chacune reconnaît ce qui la dépasse.
 */
describe("isFromNewerVersion", () => {
	it("reconnaît un projet écrit par une version plus récente", () => {
		expect(isFromNewerVersion({ id: "p1", schemaVersion: PROJECT_SCHEMA_VERSION + 1 })).toBe(true);
	});

	it("accepte un projet de la version courante", () => {
		expect(isFromNewerVersion({ id: "p1", schemaVersion: PROJECT_SCHEMA_VERSION })).toBe(false);
	});

	it("accepte un projet plus ancien", () => {
		expect(isFromNewerVersion({ id: "p1" })).toBe(false);
	});
});
