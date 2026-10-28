import { createLinearSequenceLadderSolution } from "@/templates/training/ladder/linear-sequence-ladder.template";
import { coil, no, section } from "@/templates/training/utils/ladder-dsl";
import { calledPrograms, executionSections } from "./execution-sections";

describe("execution-sections", () => {
	const project = createLinearSequenceLadderSolution();

	it("liste les programmes appelés par le Main dans l'ordre des appels", () => {
		expect(calledPrograms(project).map((p) => p.name)).toEqual([
			"Cycle_automatique",
			"Sorties",
		]);
	});

	it("remplace chaque appel par les réseaux du programme appelé", () => {
		const titles = executionSections(project).map((s) => s.title);
		expect(titles).toHaveLength(7);
		expect(titles.indexOf("X0 -> X1")).toBeLessThan(
			titles.indexOf("Sortie sortie1"),
		);
	});

	it("garde telles quelles les sections du Main qui ne sont pas des appels", () => {
		const standalone = createLinearSequenceLadderSolution();
		standalone.main.sections = [section("Seul", "", no("A"), coil("B"))];
		expect(executionSections(standalone).map((s) => s.title)).toEqual(["Seul"]);
	});
});
