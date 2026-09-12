import { Dialect } from "@/expression-language/dialect.enum";
import { deserializeProject } from "@/persistence/project-deserialization";
import { migrateProject } from "@/persistence/migrations/schema";
import { PROJECT_SCHEMA_VERSION } from "@/schemas/project/project.schema";
import Project from "@/schemas/project/project.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import { compilePipelineDetailed, compileToPLC, expectVariableValue } from "@tests/utils/test-helpers";
import v0Raw from "./fixtures/project-schema-v0.json";
import v1Raw from "./fixtures/project-schema-v1.json";

/**
 * Vérifie qu'un projet sérialisé à une version de schéma antérieure traverse la chaîne de
 * migrations **puis** tout le pipeline `analyse → pré-compilation → compilation → simulation`
 * sans casse. Les migrations sont par ailleurs testées isolément ; ce qui manquait, c'est la
 * garantie qu'une migration produit une forme que le reste du pipeline accepte réellement.
 */
describe("Migrated project → full pipeline", () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	const fixtures: { label: string; raw: unknown; from: number }[] = [
		{ label: "schema v0 (unversioned, `grafcets`, no Main, enum-ordinal dialect)", raw: v0Raw, from: 0 },
		{ label: "schema v1 (`programs`, `format`, enum-ordinal dialect)", raw: v1Raw, from: 1 },
	];

	for (const { label, raw, from } of fixtures) {
		describe(label, () => {
			it("migrates to the current schema version", () => {
				const { project, from: detectedFrom } = migrateProject(raw);
				expect(detectedFrom).toBe(from);
				expect((project as { schemaVersion: number }).schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
			});

			it("rebuilds into a Project through the production deserialization path", () => {
				const result = deserializeProject(raw as Record<string, unknown>);
				expect(result.ok).toBe(true);
				if (!result.ok) return;
				expect(result.project).toBeInstanceOf(Project);
				expect(result.project.schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
				// L'ordinal numérique du dialecte est devenu la chaîne `"FR"` (v1-to-v2).
				expect(result.project.dialect).toBe(Dialect.FR);
				// v0-to-v1 garantit un Main ; v1-to-v2 retire `format` des programmes GRAFCET.
				const grafcet = Object.values(result.project.programs).find(
					(p): p is Grafcet => p instanceof Grafcet,
				);
				expect(grafcet).toBeDefined();
				expect((grafcet as unknown as { format?: unknown }).format).toBeUndefined();
			});

			it("compiles the migrated project with no pipeline error", () => {
				const { project } = migrateProject(raw);
				const migrated = Project.createFromJSON(JSON.stringify(project));

				const pipeline = compilePipelineDetailed(migrated);

				expect(pipeline.analysis.issues.filter((i) => i.severity === "error")).toEqual([]);
				expect(pipeline.preCompilation.errors).toEqual([]);
				expect(pipeline.compilation.errors).toEqual([]);
				expect(pipeline.compilation.result).toBeDefined();
			});

			it("runs the migrated project in the PLC", async () => {
				const { project } = migrateProject(raw);
				const migrated = Project.createFromJSON(JSON.stringify(project));

				let cycleError: Error | null = null;
				const plc = compileToPLC(migrated, 10, Dialect.FR, {
					onCycleError: (e) => {
						cycleError = e;
					},
				});
				expect(plc).not.toBeNull();

				plc!.setPhysicalInputValueByName("I0", false);
				plc!.start();
				await jest.advanceTimersByTimeAsync(300);
				plc!.stop();
				if (cycleError) throw cycleError;

				// Étape initiale active, action CONTINUOUS Q0 vraie tant qu'on y reste.
				expectVariableValue(plc!, "X0", true);
				expectVariableValue(plc!, "X1", false);
				expectVariableValue(plc!, "Q0", true);
			});
		});
	}

	it("strips only the endpoints of stored GRAFCET connection paths (v0-to-v1)", () => {
		const { project } = migrateProject(v0Raw);
		const grafcet = (project as { programs: Record<string, { type: string; connections: { id: string; data: { points: unknown[] } }[] }> })
			.programs;
		const legacyGrafcet = Object.values(grafcet).find((p) => p.type === "grafcet")!;
		const customPath = legacyGrafcet.connections.find((c) => c.id === "c0")!;
		expect(customPath.data.points).toEqual([{ x: 120, y: 150 }]);
	});
});
