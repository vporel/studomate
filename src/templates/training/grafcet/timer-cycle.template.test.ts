import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Project from "@/schemas/project/project.schema";
import PlcScenario from "@tests/utils/plc-scenario";
import { compilePipelineDetailed } from "@tests/utils/test-helpers";
import {
	createTimerCycleProject,
	createTimerCycleSolution,
} from "./timer-cycle.template";

describe("timer-cycle.template", () => {
	describe("createTimerCycleProject (exercice)", () => {
		let project: Project;

		beforeEach(() => {
			project = createTimerCycleProject();
		});

		it("déclare deux sorties et aucune entrée", () => {
			expect(project.variables.map((v) => v.mnemonic)).toEqual([
				"sortie1",
				"sortie2",
			]);
			expect(
				project.variables.filter((v) => v.zone === "logic-input"),
			).toHaveLength(0);
		});

		it("passe l'analyse sans erreur", () => {
			const { analysis } = compilePipelineDetailed(project);
			const errors = analysis.issues.filter((i) => i.severity === "error");
			expect(errors).toHaveLength(0);
		});
	});

	describe("createTimerCycleSolution (correction)", () => {
		it("passe le pipeline complet sans erreur", () => {
			const { analysis, preCompilation, compilation } = compilePipelineDetailed(
				createTimerCycleSolution(),
			);

			expect(
				analysis.issues.filter((i) => i.severity === "error"),
			).toHaveLength(0);
			expect(preCompilation.errors).toHaveLength(0);
			expect(compilation.errors).toHaveLength(0);
		});

		it("ne contient que deux étapes et deux transitions temporisées", () => {
			const [grafcet] = Object.values(
				createTimerCycleSolution().programs,
			).filter((program) => program.type === "grafcet") as Grafcet[];

			expect(Object.keys(grafcet.steps)).toHaveLength(2);
			expect(
				Object.values(grafcet.transitions)
					.map((transition) => transition.data.expression)
					.sort(),
			).toEqual(["t0/X0/4s", "t1/X1/2s"]);
		});

		describe("en simulation", () => {
			beforeEach(() => jest.useFakeTimers());
			afterEach(() => jest.useRealTimers());

			it("alterne les deux sorties selon les deux durées, sans aucune entrée", async () => {
				const scenario = new PlcScenario(createTimerCycleSolution());
				await scenario.cycles(2);
				expect(scenario.get("sortie1")).toBe(true);
				expect(scenario.get("sortie2")).toBe(false);

				await scenario.seconds(3);
				expect(scenario.get("sortie1")).toBe(true);

				await scenario.seconds(2);
				expect(scenario.get("sortie1")).toBe(false);
				expect(scenario.get("sortie2")).toBe(true);

				await scenario.seconds(1);
				expect(scenario.get("sortie2")).toBe(true);

				await scenario.seconds(2);
				expect(scenario.get("sortie1")).toBe(true);
				expect(scenario.get("sortie2")).toBe(false);
			});
		});
	});

	describe("langue", () => {
		it("garde les noms français par défaut", () => {
			expect(createTimerCycleProject().name).toBe("Temporisation");
			expect(createTimerCycleSolution().name).toBe("Temporisation : solution");
		});

		it("nomme le projet et le programme en anglais", () => {
			const project = createTimerCycleSolution("en");
			expect(project.name).toBe("Timer: solution");
			expect(Object.values(project.grafcets).map((g) => g.name)).toEqual([
				"Timer",
			]);
			expect(createTimerCycleProject("en").name).toBe("Timer");
		});
	});
});
