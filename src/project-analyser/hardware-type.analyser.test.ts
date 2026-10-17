import {
	ActionExecutionMode,
	ActionType,
} from "@/schemas/grafcet/action.schema";
import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import {
	createAssignBlockElement,
	createCompareBlockElement,
} from "@/schemas/ladder/block.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Section from "@/schemas/ladder/section.schema";
import ProjectBuilder from "@/schemas/project/builders/project.builder";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import type { VariableType } from "@/schemas/variable/variable.schema";
import analyseHardwareTarget from "./hardware-target.analyser";

function projectWithGrafcet(
	variableTypes: VariableType[],
	transitionExpression = "",
	actionExpression = "",
	actionType = ActionType.NUMERIC_VARIABLE,
) {
	const project = new ProjectBuilder().id("p1").name("P").author("A").build();
	project.variables = variableTypes.map((type, i) =>
		new VariableBuilder()
			.id(`v${i}`)
			.mnemonic(`v${i}`)
			.zone("memory")
			.type(type)
			.build(),
	);
	project.hardwareTarget = { modelId: "arduino-uno-r3" };
	project.addProgram(
		new GrafcetBuilder()
			.id("g1")
			.name("G")
			.addTransition(
				new TransitionBuilder()
					.id("t1")
					.expression(transitionExpression)
					.build(),
			)
			.addAction(
				new ActionBuilder()
					.id("a1")
					.type(actionType)
					.executionMode(ActionExecutionMode.CONTINUOUS)
					.expression(actionExpression)
					.build(),
			)
			.build(),
	);
	return project;
}

const typeIssues = (project: ReturnType<typeof projectWithGrafcet>) =>
	analyseHardwareTarget(project).filter((i) =>
		i.code.includes("TYPE_NOT_SUPPORTED"),
	);

describe("hardware type analyser (Arduino Uno R3)", () => {
	it("accepts supported variable types", () => {
		expect(
			typeIssues(
				projectWithGrafcet(["BOOL", "INT", "WORD", "DINT", "DWORD", "TIME"]),
			),
		).toEqual([]);
	});

	it.each(["REAL", "STRING"] as const)(
		"reports a variable declared %s",
		(type) => {
			const issues = typeIssues(projectWithGrafcet(["INT", type]));
			expect(issues).toHaveLength(1);
			expect(issues[0].code).toBe("HARDWARE_VARIABLE_TYPE_NOT_SUPPORTED");
			expect(issues[0].params).toEqual({
				type,
				device: "Arduino Uno R3",
				variableName: "v1",
			});
		},
	);

	it("reports a real literal in a transition", () => {
		const issues = typeIssues(projectWithGrafcet(["INT"], "v0 > 1.5"));
		expect(
			issues.map((i) => [i.code, i.source.sourceType, i.params.type]),
		).toEqual([["HARDWARE_TYPE_NOT_SUPPORTED", "grafcet-transition", "REAL"]]);
		expect(issues[0].source.parentId).toBe("g1");
	});

	it("reports a real literal in an action once, even if repeated", () => {
		const issues = typeIssues(
			projectWithGrafcet(["INT"], "", "v0 := 1.5 + 2.5"),
		);
		expect(issues.map((i) => [i.source.sourceType, i.params.type])).toEqual([
			["grafcet-action", "REAL"],
		]);
	});

	it("reports a conversion to an unsupported type", () => {
		const issues = typeIssues(
			projectWithGrafcet(["INT"], "", "v0 := INT_TO_REAL(v0)"),
		);
		expect(issues.map((i) => i.params.type)).toEqual(["REAL"]);
	});

	it("accepts integer literals and supported conversions", () => {
		expect(
			typeIssues(
				projectWithGrafcet(["INT", "DINT"], "v0 > 3", "v1 := INT_TO_DINT(v0)"),
			),
		).toEqual([]);
	});

	it("ignores TEXT actions", () => {
		expect(
			typeIssues(
				projectWithGrafcet(["INT"], "", "serrer 1.5 mm", ActionType.TEXT),
			),
		).toEqual([]);
	});

	it("ignores invalid expressions", () => {
		expect(typeIssues(projectWithGrafcet(["INT"], "1.5 >> ("))).toEqual([]);
	});

	it("ignores programs excluded from execution", () => {
		const project = projectWithGrafcet(["INT"], "v0 > 1.5");
		project.grafcets["g1"].excludedFromExecution = true;
		expect(typeIssues(project)).toEqual([]);
	});

	it("reports nothing without a hardware target", () => {
		const project = projectWithGrafcet(["REAL"], "v0 > 1.5");
		project.hardwareTarget = null;
		expect(analyseHardwareTarget(project)).toEqual([]);
	});

	it("reports a real literal in an assign block and a compare block", () => {
		const project = projectWithGrafcet(["INT"]);
		const assign = createAssignBlockElement(0, 0, { out: "v0", in: "2.5" });
		const compare = createCompareBlockElement(1, 0, {
			in1: "v0",
			in2: "1.5",
			operator: ">",
		});
		const fine = createAssignBlockElement(2, 0, { out: "v0", in: "2" });
		project.addProgram(
			new Ladder("l1", "L", [
				new Section("s1", "S", "", [assign, compare, fine]),
			]),
		);
		const issues = typeIssues(project);
		expect(
			issues.map((i) => [i.source.sourceId, i.source.parentId, i.params.type]),
		).toEqual([
			[assign.id, "l1", "REAL"],
			[compare.id, "l1", "REAL"],
		]);
	});
});
