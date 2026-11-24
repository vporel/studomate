import {
	GRAFCET_TOOL_IDS,
	LADDER_TOOL_IDS,
} from "@/ui/stores/project/editor-tools";
import { TRAINING_MODULE_IDS } from "@/training/module-ids";
import type { StepData } from "./ModuleStepper";
import { buildModuleSteps } from "./training-modules";
import {
	DEFAULT_TRAINING_TOOLS,
	GRAFCET_AND_DIVERGENCE_TOOLS,
	GRAFCET_OR_DIVERGENCE_TOOLS,
	GRAFCET_SEQUENCE_TOOLS,
	LADDER_BASIC_TOOLS,
	LADDER_EDGES_TOOLS,
	LADDER_MEMORY_TOOLS,
	LADDER_READING_TOOLS,
} from "./training-tools";

describe("DEFAULT_TRAINING_TOOLS", () => {
	it("offers every ladder tool but the call of a program", () => {
		expect([...DEFAULT_TRAINING_TOOLS.ladder!].sort()).toEqual(
			LADDER_TOOL_IDS.filter((id) => id !== "user-program").sort(),
		);
	});

	it("offers every grafcet tool", () => {
		expect([...DEFAULT_TRAINING_TOOLS.grafcet!].sort()).toEqual(
			[...GRAFCET_TOOL_IDS].sort(),
		);
	});
});

describe("tools of the steps", () => {
	it("keep the divergences apart", () => {
		expect(GRAFCET_SEQUENCE_TOOLS.grafcet).not.toContain("junction-or-start");
		expect(GRAFCET_OR_DIVERGENCE_TOOLS.grafcet).toContain("junction-or-end");
		expect(GRAFCET_OR_DIVERGENCE_TOOLS.grafcet).not.toContain(
			"junction-and-start",
		);
		expect(GRAFCET_AND_DIVERGENCE_TOOLS.grafcet).toContain("junction-and-end");
		expect(GRAFCET_AND_DIVERGENCE_TOOLS.grafcet).not.toContain(
			"junction-or-start",
		);
	});

	it("add the ladder tools as the course introduces them", () => {
		expect(LADDER_READING_TOOLS.ladder).toEqual([]);
		for (const id of LADDER_BASIC_TOOLS.ladder!) {
			expect(LADDER_MEMORY_TOOLS.ladder).toContain(id);
		}
		for (const id of LADDER_MEMORY_TOOLS.ladder!) {
			expect(LADDER_EDGES_TOOLS.ladder).toContain(id);
		}
		expect(LADDER_BASIC_TOOLS.ladder).not.toContain("coil-set");
		expect(LADDER_MEMORY_TOOLS.ladder).not.toContain("contact-P");
		expect(LADDER_EDGES_TOOLS.ladder).toContain("contact-P");
	});
});

describe("embedded steps of the modules", () => {
	const embeddedSteps = TRAINING_MODULE_IDS.flatMap((moduleId) =>
		buildModuleSteps(moduleId, "fr").map((step) => ({ moduleId, step })),
	).filter(({ step }) => step.embeddedExercise);

	it.each(embeddedSteps.map(({ moduleId, step }) => [moduleId, step.id, step]))(
		"%s / %s : declares the tools of the editor it opens",
		(_moduleId, _stepId, step) => {
			const editor = (step as StepData).embeddedExercise!.initialView?.type;
			const tools = (step as StepData).embeddedTools;
			expect(
				editor === "grafcet" ? tools?.grafcet : tools?.ladder,
			).toBeDefined();
		},
	);
});
