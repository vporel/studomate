import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import { SYSTEM_VARIABLES } from "@/schemas/variable/system-variables";
import buildAnalysisEnvironment from "./analysis-environment";

describe("buildAnalysisEnvironment", () => {
	it("expose les variables du schéma et les variables système", () => {
		const moteur = new VariableBuilder()
			.id("v1")
			.mnemonic("moteur")
			.type("BOOL")
			.zone("memory")
			.build();

		const env = buildAnalysisEnvironment([moteur]);

		expect(env.existsVariableWithName("moteur")).toBe(true);
		for (const systemVariable of SYSTEM_VARIABLES) {
			expect(env.existsVariableWithName(systemVariable.name)).toBe(true);
		}
	});

	it("expose les variables système en lecture seule (direction IN)", () => {
		const env = buildAnalysisEnvironment([]);
		for (const systemVariable of SYSTEM_VARIABLES) {
			expect(env.getVariableDirectionByName(systemVariable.name)).toBe("IN");
		}
	});
});
