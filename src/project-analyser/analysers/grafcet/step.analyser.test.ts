import { analyserEnvironment } from "@tests/utils/test-helpers";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import StepAnalyser from "./step.analyser";

describe("StepAnalyser", () => {
	const analyser = new StepAnalyser();

	describe("analyseIsolated", () => {
		it("returns no issues for valid step with number", () => {
			const step = new StepBuilder().id("step-1").number(1).build();

			const issues = analyser.analyseIsolated(step);

			expect(issues).toHaveLength(0);
		});

		it("detects missing step number", () => {
			const step = new StepBuilder().id("step-1").number("").build();

			const issues = analyser.analyseIsolated(step);

			expect(issues).toHaveLength(1);
			expect(issues[0].severity).toBe("error");
			expect(issues[0].code).toBe("STEP_NUMBER_MISSING");
		});

		it("allows empty number when allowEmptyContent is true", () => {
			const step = new StepBuilder().id("step-1").number("").build();

			const issues = analyser.analyseIsolated(step, {
				allowEmptyContent: true,
			});

			expect(issues).toHaveLength(0);
		});

		it("detects negative step number", () => {
			const step = new StepBuilder().id("step-1").number(-5).build();

			const issues = analyser.analyseIsolated(step);

			expect(issues).toHaveLength(1);
			expect(issues[0].severity).toBe("error");
			expect(issues[0].code).toBe("STEP_NUMBER_NOT_POSITIVE_INTEGER");
		});

		it("detects decimal step number", () => {
			const step = new StepBuilder().id("step-1").number(1.5).build();

			const issues = analyser.analyseIsolated(step);

			expect(issues).toHaveLength(1);
			expect(issues[0].severity).toBe("error");
			expect(issues[0].code).toBe("STEP_NUMBER_NOT_POSITIVE_INTEGER");
		});

		it("accepts zero as step number", () => {
			const step = new StepBuilder().id("step-1").number(0).build();

			const issues = analyser.analyseIsolated(step);

			expect(issues).toHaveLength(0);
		});

		it("accepts large step numbers", () => {
			const step = new StepBuilder().id("step-1").number(9999).build();

			const issues = analyser.analyseIsolated(step);

			expect(issues).toHaveLength(0);
		});
	});

	describe("analyseInContext", () => {
		it("returns no issues for valid step in complete sequence", () => {
			const step1 = new StepBuilder()
				.id("step-1")
				.number(1)
				.initial()
				.position(0, 0)
				.build();
			const step2 = new StepBuilder()
				.id("step-2")
				.number(2)
				.position(0, 100)
				.build();
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("VRAI")
				.position(0, 50)
				.build();
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
				.addSteps(step1, step2)
				.addTransition(transition)
				.addConnections(c1, c2)
				.build();

			const issues = analyser.analyseInContext(
				step1,
				grafcet,
				analyserEnvironment(),
			);

			const noPredecessorIssues = issues.filter((i) =>
				i.code === "STEP_NO_PREDECESSOR",
			);
			const noSuccessorIssues = issues.filter((i) =>
				i.code === "STEP_NO_SUCCESSOR",
			);
			expect(noPredecessorIssues).toHaveLength(0);
			expect(noSuccessorIssues).toHaveLength(0);
		});

		it("detects duplicate step numbers", () => {
			const step1 = new StepBuilder().id("step-1").number(1).initial().build();
			const step2 = new StepBuilder().id("step-2").number(1).build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addSteps(step1, step2)
				.build();

			const issues = analyser.analyseInContext(
				step1,
				grafcet,
				analyserEnvironment(),
			);

			const duplicateIssue = issues.find((i) =>
				i.code === "STEP_NUMBER_DUPLICATE",
			);
			expect(duplicateIssue).toBeDefined();
			expect(duplicateIssue?.severity).toBe("error");
		});

		it("allows same number if one is empty", () => {
			const step1 = new StepBuilder().id("step-1").number(1).initial().build();
			const step2 = new StepBuilder().id("step-2").number("").build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addSteps(step1, step2)
				.build();

			const issues = analyser.analyseInContext(
				step1,
				grafcet,
				analyserEnvironment(),
			);

			const duplicateIssue = issues.find((i) =>
				i.code === "STEP_NUMBER_DUPLICATE",
			);
			expect(duplicateIssue).toBeUndefined();
		});

		it("detects step without predecessor (non-initial)", () => {
			const step = new StepBuilder()
				.id("step-1")
				.number(1)
				.initial(false)
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addStep(step)
				.build();

			const issues = analyser.analyseInContext(
				step,
				grafcet,
				analyserEnvironment(),
			);

			const noPredecessorIssue = issues.find((i) =>
				i.code === "STEP_NO_PREDECESSOR",
			);
			expect(noPredecessorIssue).toBeDefined();
			expect(noPredecessorIssue?.severity).toBe("error");
		});

		it("allows initial step without predecessor", () => {
			const step = new StepBuilder().id("step-1").number(1).initial().build();
			const transition = new TransitionBuilder()
				.id("trans-1")
				.expression("VRAI")
				.build();
			const c1 = new ConnectionBuilder()
				.id("c1")
				.source("step", "step-1", "source:successor")
				.target("transition", "trans-1", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addStep(step)
				.addTransition(transition)
				.addConnection(c1)
				.build();

			const issues = analyser.analyseInContext(
				step,
				grafcet,
				analyserEnvironment(),
			);

			const noPredecessorIssue = issues.find((i) =>
				i.code === "STEP_NO_PREDECESSOR",
			);
			expect(noPredecessorIssue).toBeUndefined();
		});

		it("detects step without successor", () => {
			const step = new StepBuilder().id("step-1").number(1).initial().build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addStep(step)
				.build();

			const issues = analyser.analyseInContext(
				step,
				grafcet,
				analyserEnvironment(),
			);

			const noSuccessorIssue = issues.find((i) => i.code === "STEP_NO_SUCCESSOR");
			expect(noSuccessorIssue).toBeDefined();
			expect(noSuccessorIssue?.severity).toBe("error");
		});

		it("detects a step with more than one successor connection", () => {
			const step = new StepBuilder()
				.id("step-1")
				.number(1)
				.initial()
				.build();
			const t1 = new TransitionBuilder().id("t1").expression("a").build();
			const t2 = new TransitionBuilder().id("t2").expression("b").build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addStep(step)
				.addTransitions(t1, t2)
				.addConnections(
					new ConnectionBuilder()
						.id("c1")
						.source("step", "step-1", "source:successor")
						.target("transition", "t1", "target:predecessor")
						.build(),
					new ConnectionBuilder()
						.id("c2")
						.source("step", "step-1", "source:successor")
						.target("transition", "t2", "target:predecessor")
						.build(),
				)
				.build();

			const issues = analyser.analyseInContext(
				step,
				grafcet,
				analyserEnvironment(),
			);

			const multipleSuccessorsIssue = issues.find(
				(i) => i.code === "STEP_MULTIPLE_SUCCESSORS",
			);
			expect(multipleSuccessorsIssue).toBeDefined();
			expect(multipleSuccessorsIssue?.severity).toBe("error");
		});

		it("accepts a step with a single successor connection", () => {
			const step1 = new StepBuilder()
				.id("step-1")
				.number(1)
				.initial()
				.build();
			const step2 = new StepBuilder().id("step-2").number(2).build();
			const transition = new TransitionBuilder()
				.id("t1")
				.expression("a")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addSteps(step1, step2)
				.addTransition(transition)
				.addConnections(
					new ConnectionBuilder()
						.id("c1")
						.source("step", "step-1", "source:successor")
						.target("transition", "t1", "target:predecessor")
						.build(),
					new ConnectionBuilder()
						.id("c2")
						.source("transition", "t1", "source:successor")
						.target("step", "step-2", "target:predecessor")
						.build(),
				)
				.build();

			const issues = analyser.analyseInContext(
				step1,
				grafcet,
				analyserEnvironment(),
			);

			expect(
				issues.find((i) => i.code === "STEP_MULTIPLE_SUCCESSORS"),
			).toBeUndefined();
		});

		it("handles multiple steps with different numbers", () => {
			const step1 = new StepBuilder().id("step-1").number(1).build();
			const step2 = new StepBuilder().id("step-2").number(2).build();
			const step3 = new StepBuilder().id("step-3").number(10).build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addSteps(step1, step2, step3)
				.build();

			const issues1 = analyser.analyseInContext(
				step1,
				grafcet,
				analyserEnvironment(),
			);
			const issues2 = analyser.analyseInContext(
				step2,
				grafcet,
				analyserEnvironment(),
			);
			const issues3 = analyser.analyseInContext(
				step3,
				grafcet,
				analyserEnvironment(),
			);

			const duplicateIssue1 = issues1.find((i) =>
				i.code === "STEP_NUMBER_DUPLICATE",
			);
			const duplicateIssue2 = issues2.find((i) =>
				i.code === "STEP_NUMBER_DUPLICATE",
			);
			const duplicateIssue3 = issues3.find((i) =>
				i.code === "STEP_NUMBER_DUPLICATE",
			);

			expect(duplicateIssue1).toBeUndefined();
			expect(duplicateIssue2).toBeUndefined();
			expect(duplicateIssue3).toBeUndefined();
		});
	});
});
