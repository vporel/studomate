import { ActionExecutionMode, ActionType } from "@/schemas/grafcet/action.schema";
import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import ActionAnalyser from "./action.analyser";

describe("ActionAnalyser", () => {
	const analyser = new ActionAnalyser();

	describe("analyseIsolated", () => {
		it("returns warning for TEXT action", () => {
			const action = new ActionBuilder()
				.id("action-1")
				.expression("Some text")
				.type(ActionType.TEXT)
				.build();

			const issues = analyser.analyseIsolated(action);

			expect(issues).toHaveLength(1);
			expect(issues[0].severity).toBe("warning");
			expect(issues[0].message).toContain("type TEXTE");
		});

		it("detects empty expression for non-TEXT action", () => {
			const action = new ActionBuilder()
				.id("action-1")
				.expression("")
				.type(ActionType.BOOLEAN_VARIABLE)
				.executionMode(ActionExecutionMode.SET)
				.build();

			const issues = analyser.analyseIsolated(action);

			const emptyExprIssue = issues.find((i) => i.message.includes("pas d'expression"));
			expect(emptyExprIssue).toBeDefined();
			expect(emptyExprIssue?.severity).toBe("warning");
		});

		it("validates BOOLEAN_VARIABLE action must be identifier", () => {
			const action = new ActionBuilder()
				.id("action-1")
				.expression("x := VRAI")
				.type(ActionType.BOOLEAN_VARIABLE)
				.executionMode(ActionExecutionMode.SET)
				.build();

			const issues = analyser.analyseIsolated(action);

			const identifierIssue = issues.find((i) => i.message.includes("simple référence"));
			expect(identifierIssue).toBeDefined();
			expect(identifierIssue?.severity).toBe("error");
		});

		it("accepts identifier for BOOLEAN_VARIABLE action", () => {
			const action = new ActionBuilder()
				.id("action-1")
				.expression("sensor")
				.type(ActionType.BOOLEAN_VARIABLE)
				.executionMode(ActionExecutionMode.SET)
				.build();

			const issues = analyser.analyseIsolated(action);

			const identifierIssues = issues.filter((i) => i.message.includes("simple référence"));
			expect(identifierIssues).toHaveLength(0);
		});

		it("validates NUMERIC_VARIABLE action must be assignment", () => {
			const action = new ActionBuilder()
				.id("action-1")
				.expression("counter")
				.type(ActionType.NUMERIC_VARIABLE)
				.executionMode(ActionExecutionMode.CONTINUOUS)
				.build();

			const issues = analyser.analyseIsolated(action);

			const assignIssue = issues.find((i) => i.message.includes("affectation"));
			expect(assignIssue).toBeDefined();
			expect(assignIssue?.severity).toBe("error");
		});

		it("accepts assignment for NUMERIC_VARIABLE action", () => {
			const action = new ActionBuilder()
				.id("action-1")
				.expression("counter := counter + 1")
				.type(ActionType.NUMERIC_VARIABLE)
				.executionMode(ActionExecutionMode.CONTINUOUS)
				.build();

			const issues = analyser.analyseIsolated(action);

			const assignIssues = issues.filter((i) => i.message.includes("affectation"));
			expect(assignIssues).toHaveLength(0);
		});

		it("validates STRING_VARIABLE action must be assignment", () => {
			const action = new ActionBuilder()
				.id("action-1")
				.expression("message")
				.type(ActionType.STRING_VARIABLE)
				.executionMode(ActionExecutionMode.RISING_EDGE)
				.build();

			const issues = analyser.analyseIsolated(action);

			const assignIssue = issues.find((i) => i.message.includes("affectation"));
			expect(assignIssue).toBeDefined();
			expect(assignIssue?.severity).toBe("error");
		});

		it("accepts assignment for STRING_VARIABLE action", () => {
			const action = new ActionBuilder()
				.id("action-1")
				.expression('msg := "Hello"')
				.type(ActionType.STRING_VARIABLE)
				.executionMode(ActionExecutionMode.RISING_EDGE)
				.build();

			const issues = analyser.analyseIsolated(action);

			const assignIssues = issues.filter((i) => i.message.includes("affectation"));
			expect(assignIssues).toHaveLength(0);
		});

		it("detects invalid execution mode for action type", () => {
			const action = new ActionBuilder()
				.id("action-1")
				.expression("sensor")
				.type(ActionType.BOOLEAN_VARIABLE)
				.executionMode(null)
				.build();

			const issues = analyser.analyseIsolated(action);

			const modeIssue = issues.find((i) => i.message.includes("mode d'exécution"));
			expect(modeIssue).toBeDefined();
			expect(modeIssue?.severity).toBe("error");
		});

		it("detects parsing errors in expression", () => {
			const action = new ActionBuilder()
				.id("action-1")
				.expression("x := + +")
				.type(ActionType.NUMERIC_VARIABLE)
				.executionMode(ActionExecutionMode.CONTINUOUS)
				.build();

			const issues = analyser.analyseIsolated(action);

			expect(issues.length).toBeGreaterThan(0);
			expect(issues.some((i) => i.severity === "error")).toBe(true);
		});
	});

	describe("analyseInContext", () => {
		it("returns empty for TEXT action", () => {
			const action = new ActionBuilder()
				.id("action-1")
				.expression("Text")
				.type(ActionType.TEXT)
				.build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").build();

			const issues = analyser.analyseInContext(action, grafcet, []);

			expect(issues).toHaveLength(0);
		});

		it("detects action not connected to step", () => {
			const action = new ActionBuilder()
				.id("action-1")
				.expression("sensor")
				.type(ActionType.BOOLEAN_VARIABLE)
				.executionMode(ActionExecutionMode.SET)
				.build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").build();

			const issues = analyser.analyseInContext(action, grafcet, []);

			const connectionIssue = issues.find((i) => i.message.includes("connectée à aucune étape"));
			expect(connectionIssue).toBeDefined();
			expect(connectionIssue?.severity).toBe("error");
		});

		it("validates variable types in numeric assignment", () => {
			const boolVar = new VariableBuilder()
				.id("var-1")
				.mnemonic("boolVar")
				.zone("memory")
				.type("BOOL")
				.build();
			const action = new ActionBuilder()
				.id("action-1")
				.expression("boolVar := 10")
				.type(ActionType.NUMERIC_VARIABLE)
				.executionMode(ActionExecutionMode.CONTINUOUS)
				.build();
			const step = new StepBuilder().id("step-1").number(1).initial().build();
			const c1 = new ConnectionBuilder()
				.id("c1")
				.source("step", "step-1", "source:action")
				.target("action", "action-1", "target:step")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addStep(step)
				.addAction(action)
				.addConnection(c1)
				.build();

			const issues = analyser.analyseInContext(action, grafcet, [boolVar]);

			const typeIssue = issues.find((i) => i.message.includes("incompatible"));
			expect(typeIssue).toBeDefined();
		});

		it("accepts correct variable types in numeric assignment", () => {
			const intVar = new VariableBuilder()
				.id("var-1")
				.mnemonic("counter")
				.zone("memory")
				.type("INT")
				.build();
			const action = new ActionBuilder()
				.id("action-1")
				.expression("counter := counter + 1")
				.type(ActionType.NUMERIC_VARIABLE)
				.executionMode(ActionExecutionMode.CONTINUOUS)
				.build();
			const step = new StepBuilder().id("step-1").number(1).initial().build();
			const c1 = new ConnectionBuilder()
				.id("c1")
				.source("step", "step-1", "source:action")
				.target("action", "action-1", "target:step")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addStep(step)
				.addAction(action)
				.addConnection(c1)
				.build();

			const issues = analyser.analyseInContext(action, grafcet, [intVar]);

			const typeIssues = issues.filter((i) => i.message.includes("incompatible"));
			expect(typeIssues).toHaveLength(0);
		});

		it("detects a constant division by zero", () => {
			const intVar = new VariableBuilder()
				.id("var-1")
				.mnemonic("counter")
				.zone("memory")
				.type("INT")
				.build();
			const action = new ActionBuilder()
				.id("action-1")
				.expression("counter := 1 / 0")
				.type(ActionType.NUMERIC_VARIABLE)
				.executionMode(ActionExecutionMode.CONTINUOUS)
				.build();
			const step = new StepBuilder().id("step-1").number(1).initial().build();
			const c1 = new ConnectionBuilder()
				.id("c1")
				.source("step", "step-1", "source:action")
				.target("action", "action-1", "target:step")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addStep(step)
				.addAction(action)
				.addConnection(c1)
				.build();

			const issues = analyser.analyseInContext(action, grafcet, [intVar]);

			const divisionIssue = issues.find((i) => i.message.includes("Division par zéro"));
			expect(divisionIssue).toBeDefined();
			expect(divisionIssue?.severity).toBe("error");
		});

		it("validates variable types in string assignment", () => {
			const intVar = new VariableBuilder()
				.id("var-1")
				.mnemonic("counter")
				.zone("memory")
				.type("INT")
				.build();
			const action = new ActionBuilder()
				.id("action-1")
				.expression('counter := "text"')
				.type(ActionType.STRING_VARIABLE)
				.executionMode(ActionExecutionMode.RISING_EDGE)
				.build();
			const step = new StepBuilder().id("step-1").number(1).initial().build();
			const c1 = new ConnectionBuilder()
				.id("c1")
				.source("step", "step-1", "source:action")
				.target("action", "action-1", "target:step")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addStep(step)
				.addAction(action)
				.addConnection(c1)
				.build();

			const issues = analyser.analyseInContext(action, grafcet, [intVar]);

			const typeIssue = issues.find((i) => i.message.includes("incompatible"));
			expect(typeIssue).toBeDefined();
		});
	});
});
