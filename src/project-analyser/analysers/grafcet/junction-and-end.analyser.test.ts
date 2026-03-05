import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import JunctionAndEndBuilder from "@/schemas/grafcet/builders/junction-and-end.builder";
import JunctionAndStartBuilder from "@/schemas/grafcet/builders/junction-and-start.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import JunctionAndEndAnalyser from "./junction-and-end.analyser";

describe("JunctionAndEndAnalyser", () => {
	const analyser = new JunctionAndEndAnalyser();

	describe("analyseIsolated", () => {
		it("returns no issues for valid junction", () => {
			const junction = new JunctionAndEndBuilder().id("junction-1").nBranches(2).build();

			const issues = analyser.analyseIsolated(junction);

			expect(issues).toHaveLength(0);
		});

		it("handles junction with multiple branches", () => {
			const junction = new JunctionAndEndBuilder().id("junction-1").nBranches(5).build();

			const issues = analyser.analyseIsolated(junction);

			expect(issues).toHaveLength(0);
		});
	});

	describe("analyseInContext", () => {
		it("detects pivot not connected", () => {
			const junction = new JunctionAndEndBuilder().id("junction-1").nBranches(2).build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").addJunctionAndEnd(junction).build();

			const issues = analyser.analyseInContext(junction, grafcet, []);

			const pivotIssue = issues.find((i) => i.message.includes("pivot"));
			expect(pivotIssue).toBeDefined();
			expect(pivotIssue?.severity).toBe("error");
		});

		it("detects branches not all connected", () => {
			const junction = new JunctionAndEndBuilder().id("junction-1").nBranches(3).build();
			const connection = new ConnectionBuilder()
				.id("c1")
				.source("junction-and-end", "junction-1", "pivot")
				.target("step", "step-1", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addJunctionAndEnd(junction)
				.addConnection(connection)
				.build();

			const issues = analyser.analyseInContext(junction, grafcet, []);

			const branchIssue = issues.find((i) => i.message.includes("branches"));
			expect(branchIssue).toBeDefined();
			expect(branchIssue?.severity).toBe("error");
		});

		it("returns no issues when all connections are valid", () => {
			// Complete AND topology: JAS → step1 → JaE, JAS → step2 → JaE
			const jas = new JunctionAndStartBuilder().id("jas-1").nBranches(2).build();
			const jae = new JunctionAndEndBuilder().id("jae-1").nBranches(2).build();
			const step1 = new StepBuilder().id("step-1").number(1).position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).position(0, 0).build();
			const [jasBranch1, jasBranch2] = jas.data.branchesOrder;
			const [jaeBranch1, jaeBranch2] = jae.data.branchesOrder;
			const cPivotIn = new ConnectionBuilder()
				.id("c0")
				.source("transition", "trans-in", "source:successor")
				.target("junction-and-start", "jas-1", "pivot")
				.build();
			const cBranch1Out = new ConnectionBuilder()
				.id("c1")
				.source("junction-and-start", "jas-1", jasBranch1)
				.target("step", "step-1", "target:predecessor")
				.build();
			const cBranch2Out = new ConnectionBuilder()
				.id("c2")
				.source("junction-and-start", "jas-1", jasBranch2)
				.target("step", "step-2", "target:predecessor")
				.build();
			const cStep1Jae = new ConnectionBuilder()
				.id("c3")
				.source("step", "step-1", "source:successor")
				.target("junction-and-end", "jae-1", jaeBranch1)
				.build();
			const cStep2Jae = new ConnectionBuilder()
				.id("c4")
				.source("step", "step-2", "source:successor")
				.target("junction-and-end", "jae-1", jaeBranch2)
				.build();
			const cPivotOut = new ConnectionBuilder()
				.id("c5")
				.source("junction-and-end", "jae-1", "pivot")
				.target("transition", "trans-out", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addSteps(step1, step2)
				.addJunctionAndStart(jas)
				.addJunctionAndEnd(jae)
				.addConnections(cPivotIn, cBranch1Out, cBranch2Out, cStep1Jae, cStep2Jae, cPivotOut)
				.build();

			const issues = analyser.analyseInContext(jae, grafcet, []);

			expect(issues).toHaveLength(0);
		});

		it("detects AND convergence with no junction-and-start reachable", () => {
			// Branches connect from steps that have no backward connection to a JaS
			const jae = new JunctionAndEndBuilder().id("jae-1").nBranches(2).build();
			const step1 = new StepBuilder().id("step-1").number(1).position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).position(0, 0).build();
			const [jaeBranch1, jaeBranch2] = jae.data.branchesOrder;
			const cBranch1 = new ConnectionBuilder()
				.id("c1")
				.source("step", "step-1", "source:successor")
				.target("junction-and-end", "jae-1", jaeBranch1)
				.build();
			const cBranch2 = new ConnectionBuilder()
				.id("c2")
				.source("step", "step-2", "source:successor")
				.target("junction-and-end", "jae-1", jaeBranch2)
				.build();
			const cPivot = new ConnectionBuilder()
				.id("c3")
				.source("junction-and-end", "jae-1", "pivot")
				.target("transition", "trans-1", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addSteps(step1, step2)
				.addJunctionAndEnd(jae)
				.addConnections(cPivot, cBranch1, cBranch2)
				.build();

			const issues = analyser.analyseInContext(jae, grafcet, []);

			const divergenceIssue = issues.find((i) => i.message.includes("divergence en ET"));
			expect(divergenceIssue).toBeDefined();
			expect(divergenceIssue?.severity).toBe("error");
		});

		it("detects AND convergence branches coming from different junction-and-starts", () => {
			const jas1 = new JunctionAndStartBuilder().id("jas-1").nBranches(1).build();
			const jas2 = new JunctionAndStartBuilder().id("jas-2").nBranches(1).build();
			const jae = new JunctionAndEndBuilder().id("jae-1").nBranches(2).build();
			const step1 = new StepBuilder().id("step-1").number(1).position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).position(0, 0).build();
			const [jas1Branch] = jas1.data.branchesOrder;
			const [jas2Branch] = jas2.data.branchesOrder;
			const [jaeBranch1, jaeBranch2] = jae.data.branchesOrder;
			const connections = [
				new ConnectionBuilder()
					.id("c0")
					.source("transition", "t0", "source:successor")
					.target("junction-and-start", "jas-1", "pivot")
					.build(),
				new ConnectionBuilder()
					.id("c1")
					.source("junction-and-start", "jas-1", jas1Branch)
					.target("step", "step-1", "target:predecessor")
					.build(),
				new ConnectionBuilder()
					.id("c2")
					.source("transition", "t1", "source:successor")
					.target("junction-and-start", "jas-2", "pivot")
					.build(),
				new ConnectionBuilder()
					.id("c3")
					.source("junction-and-start", "jas-2", jas2Branch)
					.target("step", "step-2", "target:predecessor")
					.build(),
				new ConnectionBuilder()
					.id("c4")
					.source("step", "step-1", "source:successor")
					.target("junction-and-end", "jae-1", jaeBranch1)
					.build(),
				new ConnectionBuilder()
					.id("c5")
					.source("step", "step-2", "source:successor")
					.target("junction-and-end", "jae-1", jaeBranch2)
					.build(),
				new ConnectionBuilder()
					.id("c6")
					.source("junction-and-end", "jae-1", "pivot")
					.target("transition", "t-out", "target:predecessor")
					.build(),
			];
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addSteps(step1, step2)
				.addJunctionsAndStarts(jas1, jas2)
				.addJunctionAndEnd(jae)
				.addConnections(...connections)
				.build();

			const issues = analyser.analyseInContext(jae, grafcet, []);

			const divergenceIssue = issues.find((i) => i.message.includes("divergence en ET"));
			expect(divergenceIssue).toBeDefined();
			expect(divergenceIssue?.severity).toBe("error");
		});

		it("detects mismatched branch count between JAE and JAS", () => {
			// JAE has 2 branches but the JAS it comes from has only 1
			const jas = new JunctionAndStartBuilder().id("jas-1").nBranches(1).build();
			const jae = new JunctionAndEndBuilder().id("jae-1").nBranches(2).build();
			const step1 = new StepBuilder().id("step-1").number(1).position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).position(0, 0).build();
			const [jasBranch1] = jas.data.branchesOrder;
			const [jaeBranch1, jaeBranch2] = jae.data.branchesOrder;
			const connections = [
				new ConnectionBuilder()
					.id("c0")
					.source("transition", "t0", "source:successor")
					.target("junction-and-start", "jas-1", "pivot")
					.build(),
				new ConnectionBuilder()
					.id("c1")
					.source("junction-and-start", "jas-1", jasBranch1)
					.target("step", "step-1", "target:predecessor")
					.build(),
				// Both JAE branches come from steps reachable via JAS-1 (which has only 1 branch)
				new ConnectionBuilder()
					.id("c2")
					.source("step", "step-1", "source:successor")
					.target("step", "step-2", "target:predecessor")
					.build(),
				new ConnectionBuilder()
					.id("c3")
					.source("step", "step-1", "source:successor")
					.target("junction-and-end", "jae-1", jaeBranch1)
					.build(),
				new ConnectionBuilder()
					.id("c4")
					.source("step", "step-2", "source:successor")
					.target("junction-and-end", "jae-1", jaeBranch2)
					.build(),
				new ConnectionBuilder()
					.id("c5")
					.source("junction-and-end", "jae-1", "pivot")
					.target("transition", "t-out", "target:predecessor")
					.build(),
			];
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addSteps(step1, step2)
				.addJunctionAndStart(jas)
				.addJunctionAndEnd(jae)
				.addConnections(...connections)
				.build();

			const issues = analyser.analyseInContext(jae, grafcet, []);

			const mismatchIssue = issues.find((i) => i.message.includes("nombre de branches"));
			expect(mismatchIssue).toBeDefined();
			expect(mismatchIssue?.severity).toBe("error");
		});
	});
});
