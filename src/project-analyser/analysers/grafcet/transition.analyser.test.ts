import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import TransitionAnalyser from "./transition.analyser";

describe("TransitionAnalyser", () => {
	const analyser = new TransitionAnalyser();

	describe("analyseIsolated", () => {
		it("returns no issues for valid boolean expression", () => {
			const transition = new TransitionBuilder().id("trans-1").expression("x = VRAI").build();

			const issues = analyser.analyseIsolated(transition);

			expect(issues).toHaveLength(0);
		});

		it("detects empty expression", () => {
			const transition = new TransitionBuilder().id("trans-1").expression("").build();

			const issues = analyser.analyseIsolated(transition);

			expect(issues).toHaveLength(1);
			expect(issues[0].severity).toBe("error");
			expect(issues[0].message).toContain("pas d'expression");
		});

		it("allows empty expression when allowEmptyContent is true", () => {
			const transition = new TransitionBuilder().id("trans-1").expression("").build();

			const issues = analyser.analyseIsolated(transition, { allowEmptyContent: true });

			expect(issues).toHaveLength(0);
		});

		it("detects assignment expression", () => {
			const transition = new TransitionBuilder().id("trans-1").expression("x := 5").build();

			const issues = analyser.analyseIsolated(transition);

			const assignmentIssue = issues.find((i) => i.message.includes("affectation"));
			expect(assignmentIssue).toBeDefined();
			expect(assignmentIssue?.severity).toBe("error");
		});

		it("detects numeric constant", () => {
			const transition = new TransitionBuilder().id("trans-1").expression("42").build();

			const issues = analyser.analyseIsolated(transition);

			const numericIssue = issues.find((i) => i.message.includes("constante numérique"));
			expect(numericIssue).toBeDefined();
			expect(numericIssue?.severity).toBe("error");
		});

		it("accepts boolean constants", () => {
			const transition1 = new TransitionBuilder().id("trans-1").expression("VRAI").build();
			const transition2 = new TransitionBuilder().id("trans-2").expression("FAUX").build();

			const issues1 = analyser.analyseIsolated(transition1);
			const issues2 = analyser.analyseIsolated(transition2);

			expect(issues1).toHaveLength(0);
			expect(issues2).toHaveLength(0);
		});

		it("accepts comparison expressions", () => {
			const transition = new TransitionBuilder().id("trans-1").expression("x > 10").build();

			const issues = analyser.analyseIsolated(transition);

			expect(issues).toHaveLength(0);
		});

		it("accepts logical operators", () => {
			const transition = new TransitionBuilder().id("trans-1").expression("a ET b OU c").build();

			const issues = analyser.analyseIsolated(transition);

			expect(issues).toHaveLength(0);
		});

		it("detects syntax errors", () => {
			const transition = new TransitionBuilder().id("trans-1").expression("x + +").build();

			const issues = analyser.analyseIsolated(transition);

			expect(issues.length).toBeGreaterThan(0);
			expect(issues[0].severity).toBe("error");
		});

		it("handles complex boolean expressions", () => {
			const transition = new TransitionBuilder().id("trans-1").expression("(a OU b) ET NON c").build();

			const issues = analyser.analyseIsolated(transition);

			expect(issues).toHaveLength(0);
		});
	});

	describe("analyseInContext", () => {
		it("returns no issues for valid transition in complete sequence", () => {
			const transition = new TransitionBuilder().id("trans-1").expression("VRAI").build();
			const c1 = new ConnectionBuilder()
				.id("c1")
				.source("step", "step-1", "source:successor")
				.target("transition", "trans-1", "target:predecessor")
				.build();
			const c2 = new ConnectionBuilder()
				.id("c2")
				.source("transition", "trans-1", "source:successor")
				.target("step", "step-2", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addTransition(transition)
				.addConnections(c1, c2)
				.build();

			const issues = analyser.analyseInContext(transition, grafcet, []);

			const noPredecessorIssues = issues.filter((i) => i.message.includes("amont"));
			const noSuccessorIssues = issues.filter((i) => i.message.includes("aval"));
			expect(noPredecessorIssues).toHaveLength(0);
			expect(noSuccessorIssues).toHaveLength(0);
		});

		it("detects transition without predecessor", () => {
			const transition = new TransitionBuilder().id("trans-1").expression("VRAI").build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").addTransition(transition).build();

			const issues = analyser.analyseInContext(transition, grafcet, []);

			const noPredecessorIssue = issues.find((i) => i.message.includes("amont"));
			expect(noPredecessorIssue).toBeDefined();
			expect(noPredecessorIssue?.severity).toBe("error");
		});

		it("detects transition without successor", () => {
			const transition = new TransitionBuilder().id("trans-1").expression("VRAI").build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").addTransition(transition).build();

			const issues = analyser.analyseInContext(transition, grafcet, []);

			const noSuccessorIssue = issues.find((i) => i.message.includes("aval"));
			expect(noSuccessorIssue).toBeDefined();
			expect(noSuccessorIssue?.severity).toBe("error");
		});

		it("validates variable references exist", () => {
			const transition = new TransitionBuilder().id("trans-1").expression("unknownVar").build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").addTransition(transition).build();

			const issues = analyser.analyseInContext(transition, grafcet, []);

			const undefinedVarIssue = issues.find(
				(i) => i.message.includes("unknownVar") || i.message.includes("défini"),
			);
			expect(undefinedVarIssue).toBeDefined();
		});

		it("accepts valid variable references", () => {
			const variable = new VariableBuilder()
				.id("var-1")
				.mnemonic("sensor")
				.zone("logic-input")
				.type("BOOL")
				.build();
			const transition = new TransitionBuilder().id("trans-1").expression("sensor").build();
			const c1 = new ConnectionBuilder()
				.id("c1")
				.source("step", "step-1", "source:successor")
				.target("transition", "trans-1", "target:predecessor")
				.build();
			const c2 = new ConnectionBuilder()
				.id("c2")
				.source("transition", "trans-1", "source:successor")
				.target("step", "step-2", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addTransition(transition)
				.addConnections(c1, c2)
				.build();

			const issues = analyser.analyseInContext(transition, grafcet, [variable]);

			const varIssues = issues.filter(
				(i) =>
					i.message.includes("sensor") &&
					!i.message.includes("amont") &&
					!i.message.includes("aval"),
			);
			expect(varIssues).toHaveLength(0);
		});

		it("detects non-boolean variable in identifier expression", () => {
			const variable = new VariableBuilder()
				.id("var-1")
				.mnemonic("counter")
				.zone("memory")
				.type("INT")
				.build();
			const transition = new TransitionBuilder().id("trans-1").expression("counter").build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").addTransition(transition).build();

			const issues = analyser.analyseInContext(transition, grafcet, [variable]);

			const typeIssue = issues.find((i) => i.message.includes("booléenne"));
			expect(typeIssue).toBeDefined();
			expect(typeIssue?.severity).toBe("error");
		});

		it("detects timer name conflict with variable", () => {
			const variable = new VariableBuilder()
				.id("var-1")
				.mnemonic("T1")
				.zone("memory")
				.type("BOOL")
				.build();
			const transition = new TransitionBuilder().id("trans-1").expression("T1/VRAI/5s").build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").addTransition(transition).build();

			const issues = analyser.analyseInContext(transition, grafcet, [variable]);

			const conflictIssue = issues.find((i) => i.message.includes("conflit"));
			expect(conflictIssue).toBeDefined();
			expect(conflictIssue?.severity).toBe("error");
		});

		it("allows timer declarations without conflicts", () => {
			const transition = new TransitionBuilder().id("trans-1").expression("T1/VRAI/5s").build();
			const c1 = new ConnectionBuilder()
				.id("c1")
				.source("step", "step-1", "source:successor")
				.target("transition", "trans-1", "target:predecessor")
				.build();
			const c2 = new ConnectionBuilder()
				.id("c2")
				.source("transition", "trans-1", "source:successor")
				.target("step", "step-2", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addTransition(transition)
				.addConnections(c1, c2)
				.build();

			const issues = analyser.analyseInContext(transition, grafcet, []);

			const conflictIssues = issues.filter((i) => i.message.includes("conflit"));
			expect(conflictIssues).toHaveLength(0);
		});

		it("detects transition with multiple direct successors", () => {
			const transition = new TransitionBuilder().id("trans-1").expression("VRAI").build();
			const c1 = new ConnectionBuilder()
				.id("c1")
				.source("step", "step-1", "source:successor")
				.target("transition", "trans-1", "target:predecessor")
				.build();
			const c2 = new ConnectionBuilder()
				.id("c2")
				.source("transition", "trans-1", "source:successor")
				.target("step", "step-2", "target:predecessor")
				.build();
			const c3 = new ConnectionBuilder()
				.id("c3")
				.source("transition", "trans-1", "source:successor")
				.target("step", "step-3", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addTransition(transition)
				.addConnections(c1, c2, c3)
				.build();

			const issues = analyser.analyseInContext(transition, grafcet, []);

			const multiSuccessorIssue = issues.find((i) => i.message.includes("successeur direct"));
			expect(multiSuccessorIssue).toBeDefined();
			expect(multiSuccessorIssue?.severity).toBe("error");
		});

		it("accepts transition with exactly one direct successor", () => {
			const transition = new TransitionBuilder().id("trans-1").expression("VRAI").build();
			const c1 = new ConnectionBuilder()
				.id("c1")
				.source("step", "step-1", "source:successor")
				.target("transition", "trans-1", "target:predecessor")
				.build();
			const c2 = new ConnectionBuilder()
				.id("c2")
				.source("transition", "trans-1", "source:successor")
				.target("step", "step-2", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addTransition(transition)
				.addConnections(c1, c2)
				.build();

			const issues = analyser.analyseInContext(transition, grafcet, []);

			const multiSuccessorIssues = issues.filter((i) => i.message.includes("successeur direct"));
			expect(multiSuccessorIssues).toHaveLength(0);
		});
	});
});
