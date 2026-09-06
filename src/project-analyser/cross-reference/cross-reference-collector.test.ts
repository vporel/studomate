import {
	ActionExecutionMode,
	ActionType,
} from "@/schemas/grafcet/action.schema";
import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import {
	createContactElement,
	createCoilElement,
} from "@/schemas/ladder/element.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Section from "@/schemas/ladder/section.schema";
import Project from "@/schemas/project/project.schema";
import CrossReferenceCollector from "./cross-reference-collector";

function buildProject(): Project {
	const project = new Project("p1", "P", "");
	const grafcet = new GrafcetBuilder()
		.id("g1")
		.name("Grafcet 1")
		.addTransition(new TransitionBuilder().id("t1").expression("Dcy").build())
		.addAction(
			new ActionBuilder()
				.id("a1")
				.type(ActionType.NUMERIC_VARIABLE)
				.executionMode(ActionExecutionMode.CONTINUOUS)
				.expression("Cnt := Cnt + 1")
				.build(),
		)
		.build();
	project.addProgram(grafcet);

	const ladder = new Ladder("lad1", "Ladder 1", [
		new Section("sec1", "S", "", [
			createContactElement("Dcy", "NO", 0, 0),
			createCoilElement("Moteur", "normal", 0, 3),
		]),
	]);
	project.addProgram(ladder);
	return project;
}

describe("CrossReferenceCollector", () => {
	it("regroupe les références par variable, tous programmes confondus, triées par nom", () => {
		const crossRefs = CrossReferenceCollector.collect(buildProject());
		expect(crossRefs.map((c) => c.variableName)).toEqual([
			"Cnt",
			"Dcy",
			"Moteur",
		]);
	});

	it("agrège lectures ladder et grafcet pour une même variable", () => {
		const crossRefs = CrossReferenceCollector.collect(buildProject());
		const dcy = crossRefs.find((c) => c.variableName === "Dcy")!;
		expect(dcy.references).toHaveLength(2);
		expect(dcy.references.every((r) => r.access === "read")).toBe(true);
		expect(dcy.references.map((r) => r.programType).sort()).toEqual([
			"grafcet",
			"ladder",
		]);
	});

	it("expose une variable lue et écrite au même endroit avec les deux accès", () => {
		const crossRefs = CrossReferenceCollector.collect(buildProject());
		const cnt = crossRefs.find((c) => c.variableName === "Cnt")!;
		expect(cnt.references.map((r) => r.access).sort()).toEqual(["read", "write"]);
	});

	it("ne lève pas sur un projet vide", () => {
		expect(CrossReferenceCollector.collect(new Project("p", "P", ""))).toEqual([]);
	});
});
