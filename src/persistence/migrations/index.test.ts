import { PROJECT_SCHEMA_VERSION } from "@/schemas/project/project.schema";
import { UNVERSIONED } from "./migration";
import { isFromNewerVersion, migrateProject } from "./index";

describe("migrateProject", () => {
	it("amène un projet non versionné à la version courante", () => {
		const ancien = { id: "p1", name: "A", grafcets: { g1: { id: "g1" } } };

		const { project, from } = migrateProject(ancien);

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
					steps: [{ id: "s1", data: { number: 1, width: 40, height: 40 }, position: { x: 0, y: 0 } }],
				},
			},
		};

		const { project } = migrateProject(ancien);

		const step = (project.programs.g1 as any).steps[0];
		expect(step.data).toEqual({ number: 1 });
		expect(step.size).toEqual({ width: 40, height: 40 });
	});

	it("ajoute un programme Main si aucun n'existe déjà", () => {
		const ancien = { id: "p1", name: "A", grafcets: { g1: { id: "g1" } } };

		const { project } = migrateProject(ancien);

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
			programs: { m1: { id: "m1", type: "ladder", role: "main", sections: [] } },
		};

		const { project } = migrateProject(ancien);

		const mains = Object.values(project.programs as Record<string, any>).filter(
			(p: any) => p.type === "ladder" && p.role === "main",
		);
		expect(mains).toHaveLength(1);
	});

	it("déballe les champs HMI qui portaient un HmiBindableValue", () => {
		const ancien = {
			id: "p1",
			name: "A",
			programs: {},
			hmiPages: {
				h1: {
					id: "h1",
					name: "Vue",
					widgets: [
						{
							id: "w1",
							type: "rectangle",
							data: { style: { fill: { value: "#fff" }, stroke: { value: "#000" }, strokeWidth: 2 } },
						},
						{ id: "w2", type: "text", data: { text: { value: "Texte" } } },
						{
							id: "w3",
							type: "gauge",
							data: { variableMnemonic: "", label: "", style: { orientation: { value: "vertical" } } },
						},
					],
				},
			},
		};

		const { project } = migrateProject(ancien);

		const widgets = (project.hmiPages as any).h1.widgets;
		expect(widgets[0].data.style.fill).toBe("#fff");
		expect(widgets[0].data.style.stroke).toBe("#000");
		expect(widgets[1].data.text).toBe("Texte");
		expect(widgets[2].data.style.orientation).toBe("vertical");
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
