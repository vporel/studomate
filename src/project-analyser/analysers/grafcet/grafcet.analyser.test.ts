import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import ProjectBuilder from "@/schemas/project/builders/project.builder";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import GrafcetAnalyser, { getStepVariableId, getStepVariableMnemonic } from "./grafcet.analyser";

describe("GrafcetAnalyser", () => {
	describe("getStepVariableId", () => {
		it("generates step variable ID", () => {
			const id = getStepVariableId("grafcet-1", 5);
			expect(id).toBe("grafcet-grafcet-1-step-5");
		});

		it("handles different grafcet IDs", () => {
			const id1 = getStepVariableId("grafcet-abc", 10);
			const id2 = getStepVariableId("grafcet-xyz", 10);
			expect(id1).not.toBe(id2);
		});
	});

	describe("getStepVariableMnemonic", () => {
		it("generates X mnemonic", () => {
			expect(getStepVariableMnemonic(1)).toBe("X1");
			expect(getStepVariableMnemonic(10)).toBe("X10");
			expect(getStepVariableMnemonic(100)).toBe("X100");
		});

		it("handles zero", () => {
			expect(getStepVariableMnemonic(0)).toBe("X0");
		});
	});

	describe("analyse", () => {
		it("returns no issues for valid grafcet with initial step", () => {
			const step = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).position(0, 100).build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").name("Test").addSteps(step, step2).build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();
			const result = GrafcetAnalyser.analyse(grafcet, project);

			const errors = result.issues.filter((i) => i.severity === "error");
			// Step will have errors about no predecessor/successor, but no grafcet-level errors
			const grafcetErrors = errors.filter((i) => i.source.sourceType === "grafcet");
			expect(grafcetErrors).toHaveLength(0);
		});

		it("detects missing initial step", () => {
			const step = new StepBuilder().id("step-1").number(1).initial(false).position(0, 0).build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").name("Test").addStep(step).build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();
			const result = GrafcetAnalyser.analyse(grafcet, project);

			const initialStepError = result.issues.find(
				(issue) => issue.source.sourceType === "grafcet" && issue.message.includes("étape initiale"),
			);
			expect(initialStepError).toBeDefined();
			expect(initialStepError?.severity).toBe("error");
		});

		it("generates step variables for valid step numbers", () => {
			const step1 = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).position(0, 100).build();
			const step3 = new StepBuilder().id("step-3").number(10).position(0, 200).build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.name("Test")
				.addSteps(step1, step2, step3)
				.build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();
			const result = GrafcetAnalyser.analyse(grafcet, project);

			expect(result.stepsVariables).toHaveLength(3);
			expect(result.stepsVariables[0].mnemonic).toBe("X1");
			expect(result.stepsVariables[1].mnemonic).toBe("X2");
			expect(result.stepsVariables[2].mnemonic).toBe("X10");

			result.stepsVariables.forEach((v) => {
				expect(v.zone).toBe("memory");
				expect(v.type).toBe("BOOL");
				expect(v.getNativeType()).toBe("boolean");
			});
		});

		it("skips step variables for invalid step numbers", () => {
			const step1 = new StepBuilder().id("step-1").number("").initial().position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(-5).position(0, 100).build();
			const step3 = new StepBuilder().id("step-3").number(1.5).position(0, 200).build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.name("Test")
				.addSteps(step1, step2, step3)
				.build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();
			const result = GrafcetAnalyser.analyse(grafcet, project);

			expect(result.stepsVariables).toHaveLength(0);
		});

		it("deduplicates step variables by number", () => {
			const step1 = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(1).position(0, 100).build();
			const step3 = new StepBuilder().id("step-3").number(1).position(0, 200).build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.name("Test")
				.addSteps(step1, step2, step3)
				.build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();
			const result = GrafcetAnalyser.analyse(grafcet, project);

			// Only one X1 variable despite 3 steps with number 1
			expect(result.stepsVariables).toHaveLength(1);
			expect(result.stepsVariables[0].mnemonic).toBe("X1");
		});

		it("attaches parent ID to all element issues", () => {
			const step = new StepBuilder().id("step-1").number("").initial().position(0, 0).build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").name("Test").addStep(step).build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();
			const result = GrafcetAnalyser.analyse(grafcet, project);

			const elementIssues = result.issues.filter((i) => i.source.sourceType !== "grafcet");
			expect(elementIssues.length).toBeGreaterThan(0);
			elementIssues.forEach((issue) => {
				expect(issue.source.parentId).toBe("grafcet-1");
			});
		});

		it("analyses all element types in grafcet", () => {
			const step = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const transition = new TransitionBuilder().id("trans-1").expression("").position(0, 50).build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.name("Test")
				.addStep(step)
				.addTransition(transition)
				.build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();
			const result = GrafcetAnalyser.analyse(grafcet, project);

			// Should have issues from both step and transition
			const stepIssues = result.issues.filter((i) => i.source.sourceType === "grafcet-step");
			const transitionIssues = result.issues.filter(
				(i) => i.source.sourceType === "grafcet-transition",
			);

			expect(stepIssues.length).toBeGreaterThan(0);
			expect(transitionIssues.length).toBeGreaterThan(0);
		});

		it("passes project variables to analysers", () => {
			const projectVar = new VariableBuilder()
				.id("var-1")
				.mnemonic("MyVar")
				.zone("logic-input")
				.type("BOOL")
				.build();
			const step1 = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).position(0, 100).build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").name("Test").addSteps(step1, step2).build();
			const project = new ProjectBuilder()
				.id("project-1")
				.name("Test")
				.author("Author")
				.addVariable(projectVar)
				.build();
			// This should not throw - analysers receive both project vars and step vars
			const result = GrafcetAnalyser.analyse(grafcet, project);

			expect(result).toBeDefined();
		});

		it("detects a project variable colliding with a step variable X{n}", () => {
			const conflictingVar = new VariableBuilder()
				.id("var-1")
				.mnemonic("X1")
				.zone("memory")
				.type("BOOL")
				.build();
			const step1 = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).position(0, 100).build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").name("Test").addSteps(step1, step2).build();
			const project = new ProjectBuilder()
				.id("project-1")
				.name("Test")
				.author("Author")
				.addVariable(conflictingVar)
				.build();

			const result = GrafcetAnalyser.analyse(grafcet, project);

			const conflictIssue = result.issues.find((i) => i.code === "GRAFCET_STEP_VARIABLE_NAME_CONFLICT");
			expect(conflictIssue).toBeDefined();
			expect(conflictIssue?.severity).toBe("error");
			expect(conflictIssue?.message).toContain("X1");
		});

		it("returns no name-conflict issue when project variables don't collide with X{n}", () => {
			const projectVar = new VariableBuilder()
				.id("var-1")
				.mnemonic("MyVar")
				.zone("memory")
				.type("BOOL")
				.build();
			const step1 = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).position(0, 100).build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").name("Test").addSteps(step1, step2).build();
			const project = new ProjectBuilder()
				.id("project-1")
				.name("Test")
				.author("Author")
				.addVariable(projectVar)
				.build();

			const result = GrafcetAnalyser.analyse(grafcet, project);

			expect(result.issues.find((i) => i.code === "GRAFCET_STEP_VARIABLE_NAME_CONFLICT")).toBeUndefined();
		});

		it("handles empty grafcet", () => {
			const grafcet = new GrafcetBuilder().id("grafcet-1").name("Test").build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();
			const result = GrafcetAnalyser.analyse(grafcet, project);

			expect(result.stepsVariables).toEqual([]);
			// Should have error about missing initial step
			const initialStepError = result.issues.find((i) => i.message.includes("étape initiale"));
			expect(initialStepError).toBeDefined();
		});

		it("detects multiple initial steps", () => {
			const step1 = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).initial().position(0, 100).build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").name("Test").addSteps(step1, step2).build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();

			const result = GrafcetAnalyser.analyse(grafcet, project);

			const initialStepError = result.issues.find((i) => i.message.includes("étape initiale"));
			expect(initialStepError).toBeDefined();
			expect(initialStepError?.severity).toBe("error");
		});

		it("returns no connectivity error for a single connected chain", () => {
			// step-1 →[trans-1]→ step-2
			const step1 = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).position(0, 200).build();
			const trans1 = new TransitionBuilder().id("trans-1").expression("E1").position(0, 100).build();
			const conn1 = new ConnectionBuilder()
				.id("conn-1")
				.source("step", "step-1", "source:successor")
				.target("transition", "trans-1", "target:predecessor")
				.build();
			const conn2 = new ConnectionBuilder()
				.id("conn-2")
				.source("transition", "trans-1", "source:successor")
				.target("step", "step-2", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.name("Test")
				.addSteps(step1, step2)
				.addTransition(trans1)
				.addConnections(conn1, conn2)
				.build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();

			const result = GrafcetAnalyser.analyse(grafcet, project);

			const connectivityError = result.issues.find(
				(i) => i.source.sourceType === "grafcet" && i.message.includes("réseaux non connectés"),
			);
			expect(connectivityError).toBeUndefined();
		});

		it("detects a step unreachable from the initial step, even in an undirected-connected grafcet", () => {
			// Main cycle: step-1 (initial) →[trans-1]→ step-2 →[trans-2]→ step-1
			// step-3 →[trans-3]→ step-2 : connects step-3 to the graph, but nothing routes FROM
			// step-1 TO step-3 — connexe en non orienté, mais step-3 n'est jamais atteint.
			const step1 = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).position(0, 200).build();
			const step3 = new StepBuilder().id("step-3").number(3).position(400, 200).build();
			const trans1 = new TransitionBuilder().id("trans-1").expression("E1").position(0, 100).build();
			const trans2 = new TransitionBuilder().id("trans-2").expression("E2").position(0, 300).build();
			const trans3 = new TransitionBuilder().id("trans-3").expression("E3").position(400, 100).build();
			const conns = [
				new ConnectionBuilder()
					.id("c1")
					.source("step", "step-1", "source:successor")
					.target("transition", "trans-1", "target:predecessor")
					.build(),
				new ConnectionBuilder()
					.id("c2")
					.source("transition", "trans-1", "source:successor")
					.target("step", "step-2", "target:predecessor")
					.build(),
				new ConnectionBuilder()
					.id("c3")
					.source("step", "step-2", "source:successor")
					.target("transition", "trans-2", "target:predecessor")
					.build(),
				new ConnectionBuilder()
					.id("c4")
					.source("transition", "trans-2", "source:successor")
					.target("step", "step-1", "target:predecessor")
					.build(),
				new ConnectionBuilder()
					.id("c5")
					.source("step", "step-3", "source:successor")
					.target("transition", "trans-3", "target:predecessor")
					.build(),
				new ConnectionBuilder()
					.id("c6")
					.source("transition", "trans-3", "source:successor")
					.target("step", "step-2", "target:predecessor")
					.build(),
			];
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.name("Test")
				.addSteps(step1, step2, step3)
				.addTransitions(trans1, trans2, trans3)
				.addConnections(...conns)
				.build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();

			const result = GrafcetAnalyser.analyse(grafcet, project);

			const unreachableError = result.issues.find((i) => i.code === "GRAFCET_UNREACHABLE_STEPS");
			expect(unreachableError).toBeDefined();
			expect(unreachableError?.severity).toBe("error");
			expect(unreachableError?.message).toContain("3");
		});

		it("detects a dead-end branch with no path back to a cycle", () => {
			// Main cycle: step-1 (initial) →[trans-1]→ step-2 →[trans-2]→ step-1
			// Dead-end branch off the cycle: step-2 →[trans-3]→ step-3 (terminal, no way back)
			const step1 = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).position(0, 200).build();
			const step3 = new StepBuilder().id("step-3").number(3).position(400, 200).build();
			const trans1 = new TransitionBuilder().id("trans-1").expression("E1").position(0, 100).build();
			const trans2 = new TransitionBuilder().id("trans-2").expression("E2").position(0, 300).build();
			const trans3 = new TransitionBuilder().id("trans-3").expression("E3").position(400, 100).build();
			const conns = [
				new ConnectionBuilder()
					.id("c1")
					.source("step", "step-1", "source:successor")
					.target("transition", "trans-1", "target:predecessor")
					.build(),
				new ConnectionBuilder()
					.id("c2")
					.source("transition", "trans-1", "source:successor")
					.target("step", "step-2", "target:predecessor")
					.build(),
				new ConnectionBuilder()
					.id("c3")
					.source("step", "step-2", "source:successor")
					.target("transition", "trans-2", "target:predecessor")
					.build(),
				new ConnectionBuilder()
					.id("c4")
					.source("transition", "trans-2", "source:successor")
					.target("step", "step-1", "target:predecessor")
					.build(),
				new ConnectionBuilder()
					.id("c5")
					.source("step", "step-2", "source:successor")
					.target("transition", "trans-3", "target:predecessor")
					.build(),
				new ConnectionBuilder()
					.id("c6")
					.source("transition", "trans-3", "source:successor")
					.target("step", "step-3", "target:predecessor")
					.build(),
			];
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.name("Test")
				.addSteps(step1, step2, step3)
				.addTransitions(trans1, trans2, trans3)
				.addConnections(...conns)
				.build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();

			const result = GrafcetAnalyser.analyse(grafcet, project);

			const deadEndWarning = result.issues.find((i) => i.code === "GRAFCET_DEAD_END_STEPS");
			expect(deadEndWarning).toBeDefined();
			expect(deadEndWarning?.severity).toBe("warning");
			expect(deadEndWarning?.message).toContain("3");
		});

		it("returns no dead-end warning for a purely linear grafcet with no cycle at all", () => {
			// step-1 (initial) →[trans-1]→ step-2, no loop back : process linéaire volontaire.
			const step1 = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).position(0, 200).build();
			const trans1 = new TransitionBuilder().id("trans-1").expression("E1").position(0, 100).build();
			const conns = [
				new ConnectionBuilder()
					.id("c1")
					.source("step", "step-1", "source:successor")
					.target("transition", "trans-1", "target:predecessor")
					.build(),
				new ConnectionBuilder()
					.id("c2")
					.source("transition", "trans-1", "source:successor")
					.target("step", "step-2", "target:predecessor")
					.build(),
			];
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.name("Test")
				.addSteps(step1, step2)
				.addTransition(trans1)
				.addConnections(...conns)
				.build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();

			const result = GrafcetAnalyser.analyse(grafcet, project);

			expect(result.issues.find((i) => i.code === "GRAFCET_DEAD_END_STEPS")).toBeUndefined();
			expect(result.issues.find((i) => i.code === "GRAFCET_UNREACHABLE_STEPS")).toBeUndefined();
		});

		it("returns no directed-reachability issues for a normal cyclic grafcet", () => {
			const step1 = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).position(0, 200).build();
			const trans1 = new TransitionBuilder().id("trans-1").expression("E1").position(0, 100).build();
			const trans2 = new TransitionBuilder().id("trans-2").expression("E2").position(0, 300).build();
			const conns = [
				new ConnectionBuilder()
					.id("c1")
					.source("step", "step-1", "source:successor")
					.target("transition", "trans-1", "target:predecessor")
					.build(),
				new ConnectionBuilder()
					.id("c2")
					.source("transition", "trans-1", "source:successor")
					.target("step", "step-2", "target:predecessor")
					.build(),
				new ConnectionBuilder()
					.id("c3")
					.source("step", "step-2", "source:successor")
					.target("transition", "trans-2", "target:predecessor")
					.build(),
				new ConnectionBuilder()
					.id("c4")
					.source("transition", "trans-2", "source:successor")
					.target("step", "step-1", "target:predecessor")
					.build(),
			];
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.name("Test")
				.addSteps(step1, step2)
				.addTransitions(trans1, trans2)
				.addConnections(...conns)
				.build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();

			const result = GrafcetAnalyser.analyse(grafcet, project);

			expect(result.issues.find((i) => i.code === "GRAFCET_DEAD_END_STEPS")).toBeUndefined();
			expect(result.issues.find((i) => i.code === "GRAFCET_UNREACHABLE_STEPS")).toBeUndefined();
		});

		it("detects two disconnected cycles in the same grafcet", () => {
			// Cycle A: step-1 →[trans-1]→ step-2
			// Cycle B: step-3 →[trans-2]→ step-4  (no connection to cycle A)
			const step1 = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).position(0, 200).build();
			const step3 = new StepBuilder().id("step-3").number(3).initial(false).position(400, 0).build();
			const step4 = new StepBuilder().id("step-4").number(4).position(400, 200).build();
			const trans1 = new TransitionBuilder().id("trans-1").expression("E1").position(0, 100).build();
			const trans2 = new TransitionBuilder().id("trans-2").expression("E2").position(400, 100).build();
			const connA1 = new ConnectionBuilder()
				.id("conn-a1")
				.source("step", "step-1", "source:successor")
				.target("transition", "trans-1", "target:predecessor")
				.build();
			const connA2 = new ConnectionBuilder()
				.id("conn-a2")
				.source("transition", "trans-1", "source:successor")
				.target("step", "step-2", "target:predecessor")
				.build();
			const connB1 = new ConnectionBuilder()
				.id("conn-b1")
				.source("step", "step-3", "source:successor")
				.target("transition", "trans-2", "target:predecessor")
				.build();
			const connB2 = new ConnectionBuilder()
				.id("conn-b2")
				.source("transition", "trans-2", "source:successor")
				.target("step", "step-4", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.name("Test")
				.addSteps(step1, step2, step3, step4)
				.addTransitions(trans1, trans2)
				.addConnections(connA1, connA2, connB1, connB2)
				.build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();

			const result = GrafcetAnalyser.analyse(grafcet, project);

			const connectivityError = result.issues.find(
				(i) => i.source.sourceType === "grafcet" && i.message.includes("réseaux non connectés"),
			);
			expect(connectivityError).toBeDefined();
			expect(connectivityError?.severity).toBe("error");
			expect(connectivityError?.source.sourceId).toBe("grafcet-1");
		});

		it("returns no connectivity error when grafcet has no connections at all", () => {
			const step1 = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").name("Test").addStep(step1).build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();

			const result = GrafcetAnalyser.analyse(grafcet, project);

			const connectivityError = result.issues.find(
				(i) => i.source.sourceType === "grafcet" && i.message.includes("réseaux non connectés"),
			);
			expect(connectivityError).toBeUndefined();
		});

		it("returns no connection-type error for a valid chain", () => {
			const step1 = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).position(0, 200).build();
			const trans1 = new TransitionBuilder().id("trans-1").expression("E1").position(0, 100).build();
			const conn1 = new ConnectionBuilder()
				.id("conn-1")
				.source("step", "step-1", "source:successor")
				.target("transition", "trans-1", "target:predecessor")
				.build();
			const conn2 = new ConnectionBuilder()
				.id("conn-2")
				.source("transition", "trans-1", "source:successor")
				.target("step", "step-2", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.name("Test")
				.addSteps(step1, step2)
				.addTransition(trans1)
				.addConnections(conn1, conn2)
				.build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();

			const result = GrafcetAnalyser.analyse(grafcet, project);

			const connectionTypeError = result.issues.find(
				(i) => i.code === "GRAFCET_CONNECTION_INVALID_TYPE" || i.code === "GRAFCET_CONNECTION_DANGLING_ELEMENT",
			);
			expect(connectionTypeError).toBeUndefined();
		});

		it("detects a connection between two incompatible element types", () => {
			// step-1 → step-2 directement : viole l'alternance étape–transition
			const step1 = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).position(0, 200).build();
			const conn = new ConnectionBuilder()
				.id("conn-1")
				.source("step", "step-1", "source:successor")
				.target("step", "step-2", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.name("Test")
				.addSteps(step1, step2)
				.addConnections(conn)
				.build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();

			const result = GrafcetAnalyser.analyse(grafcet, project);

			const connectionTypeError = result.issues.find((i) => i.code === "GRAFCET_CONNECTION_INVALID_TYPE");
			expect(connectionTypeError).toBeDefined();
			expect(connectionTypeError?.severity).toBe("error");
			expect(connectionTypeError?.source.sourceId).toBe("grafcet-1");
		});

		it("detects a connection referencing a nonexistent element", () => {
			const step1 = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).position(0, 200).build();
			const conn = new ConnectionBuilder()
				.id("conn-1")
				.source("step", "step-1", "source:successor")
				.target("transition", "trans-ghost", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.name("Test")
				.addSteps(step1, step2)
				.addConnections(conn)
				.build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();

			const result = GrafcetAnalyser.analyse(grafcet, project);

			const danglingError = result.issues.find((i) => i.code === "GRAFCET_CONNECTION_DANGLING_ELEMENT");
			expect(danglingError).toBeDefined();
			expect(danglingError?.severity).toBe("error");
		});

		it("detects grafcet with zero steps", () => {
			const grafcet = new GrafcetBuilder().id("grafcet-1").name("Test").build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();

			const result = GrafcetAnalyser.analyse(grafcet, project);

			const twoStepsError = result.issues.find(
				(i) => i.source.sourceType === "grafcet" && i.message.includes("au moins deux étapes"),
			);
			expect(twoStepsError).toBeDefined();
			expect(twoStepsError?.severity).toBe("error");
			expect(twoStepsError?.source.sourceId).toBe("grafcet-1");
		});

		it("detects grafcet with only one step", () => {
			const step1 = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").name("Test").addStep(step1).build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();

			const result = GrafcetAnalyser.analyse(grafcet, project);

			const twoStepsError = result.issues.find(
				(i) => i.source.sourceType === "grafcet" && i.message.includes("au moins deux étapes"),
			);
			expect(twoStepsError).toBeDefined();
			expect(twoStepsError?.severity).toBe("error");
		});

		it("returns no error for grafcet with more than one steps", () => {
			const step1 = new StepBuilder().id("step-1").number(1).initial().position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).position(0, 100).build();
			const step3 = new StepBuilder().id("step-3").number(3).position(0, 200).build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.name("Test")
				.addSteps(step1, step2, step3)
				.build();
			const project = new ProjectBuilder().id("project-1").name("Test").author("Author").build();

			const result = GrafcetAnalyser.analyse(grafcet, project);

			const twoStepsError = result.issues.find(
				(i) => i.source.sourceType === "grafcet" && i.message.includes("au moins deux étapes"),
			);
			expect(twoStepsError).toBeUndefined();
		});
	});
});
