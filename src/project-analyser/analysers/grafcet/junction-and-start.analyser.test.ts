import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import JunctionAndEndBuilder from "@/schemas/grafcet/builders/junction-and-end.builder";
import JunctionAndStartBuilder from "@/schemas/grafcet/builders/junction-and-start.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import JunctionAndStartAnalyser from "./junction-and-start.analyser";

describe("JunctionAndStartAnalyser", () => {
	const analyser = new JunctionAndStartAnalyser();

	describe("analyseIsolated", () => {
		it("returns no issues for valid junction", () => {
			const junction = new JunctionAndStartBuilder().id("junction-1").nBranches(2).build();

			const issues = analyser.analyseIsolated(junction);

			expect(issues).toHaveLength(0);
		});

		it("handles junction with multiple branches", () => {
			const junction = new JunctionAndStartBuilder().id("junction-1").nBranches(5).build();

			const issues = analyser.analyseIsolated(junction);

			expect(issues).toHaveLength(0);
		});
	});

	describe("analyseInContext", () => {
		it("detects pivot not connected", () => {
			const junction = new JunctionAndStartBuilder().id("junction-1").nBranches(2).build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").addJunctionAndStart(junction).build();

			const issues = analyser.analyseInContext(junction, grafcet, []);

			const pivotIssue = issues.find((i) => i.message.includes("pivot"));
			expect(pivotIssue).toBeDefined();
			expect(pivotIssue?.severity).toBe("error");
		});

		it("detects branches not all connected", () => {
			const junction = new JunctionAndStartBuilder().id("junction-1").nBranches(3).build();
			const connection = new ConnectionBuilder()
				.id("c1")
				.source("step", "step-1", "source:successor")
				.target("junction-and-start", "junction-1", "target:pivot")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addJunctionAndStart(junction)
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
			const cPivot = new ConnectionBuilder()
				.id("c0")
				.source("transition", "trans-1", "source:successor")
				.target("junction-and-start", "jas-1", "pivot")
				.build();
			const cBranch1 = new ConnectionBuilder()
				.id("c1")
				.source("junction-and-start", "jas-1", jasBranch1)
				.target("step", "step-1", "target:predecessor")
				.build();
			const cBranch2 = new ConnectionBuilder()
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
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addSteps(step1, step2)
				.addJunctionAndStart(jas)
				.addJunctionAndEnd(jae)
				.addConnections(cPivot, cBranch1, cBranch2, cStep1Jae, cStep2Jae)
				.build();

			const issues = analyser.analyseInContext(jas, grafcet, []);

			expect(issues).toHaveLength(0);
		});

		it("detects AND divergence with no junction-and-end reachable", () => {
			// Branches connect to steps that have no onward connection to a JaE
			const jas = new JunctionAndStartBuilder().id("jas-1").nBranches(2).build();
			const step1 = new StepBuilder().id("step-1").number(1).position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).position(0, 0).build();
			const [jasBranch1, jasBranch2] = jas.data.branchesOrder;
			const cPivot = new ConnectionBuilder()
				.id("c0")
				.source("transition", "trans-1", "source:successor")
				.target("junction-and-start", "jas-1", "pivot")
				.build();
			const cBranch1 = new ConnectionBuilder()
				.id("c1")
				.source("junction-and-start", "jas-1", jasBranch1)
				.target("step", "step-1", "target:predecessor")
				.build();
			const cBranch2 = new ConnectionBuilder()
				.id("c2")
				.source("junction-and-start", "jas-1", jasBranch2)
				.target("step", "step-2", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addSteps(step1, step2)
				.addJunctionAndStart(jas)
				.addConnections(cPivot, cBranch1, cBranch2)
				.build();

			const issues = analyser.analyseInContext(jas, grafcet, []);

			const closureIssue = issues.find((i) => i.message.includes("convergence en ET"));
			expect(closureIssue).toBeDefined();
			expect(closureIssue?.severity).toBe("error");
		});

		it("detects AND divergence branches reaching different junction-and-ends", () => {
			const jas = new JunctionAndStartBuilder().id("jas-1").nBranches(2).build();
			const jae1 = new JunctionAndEndBuilder().id("jae-1").nBranches(1).build();
			const jae2 = new JunctionAndEndBuilder().id("jae-2").nBranches(1).build();
			const step1 = new StepBuilder().id("step-1").number(1).position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).position(0, 0).build();
			const [jasBranch1, jasBranch2] = jas.data.branchesOrder;
			const [jae1Branch] = jae1.data.branchesOrder;
			const [jae2Branch] = jae2.data.branchesOrder;
			const connections = [
				new ConnectionBuilder().id("c0").source("transition", "t0", "source:successor").target("junction-and-start", "jas-1", "pivot").build(),
				new ConnectionBuilder().id("c1").source("junction-and-start", "jas-1", jasBranch1).target("step", "step-1", "target:predecessor").build(),
				new ConnectionBuilder().id("c2").source("junction-and-start", "jas-1", jasBranch2).target("step", "step-2", "target:predecessor").build(),
				new ConnectionBuilder().id("c3").source("step", "step-1", "source:successor").target("junction-and-end", "jae-1", jae1Branch).build(),
				new ConnectionBuilder().id("c4").source("step", "step-2", "source:successor").target("junction-and-end", "jae-2", jae2Branch).build(),
			];
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addSteps(step1, step2)
				.addJunctionAndStart(jas)
				.addJunctionsAndEnds(jae1, jae2)
				.addConnections(...connections)
				.build();

			const issues = analyser.analyseInContext(jas, grafcet, []);

			const closureIssue = issues.find((i) => i.message.includes("convergence en ET"));
			expect(closureIssue).toBeDefined();
			expect(closureIssue?.severity).toBe("error");
		});

		it("detects mismatched branch count between JAS and JAE", () => {
			// JAS has 2 branches but the JAE it reaches has only 1
			const jas = new JunctionAndStartBuilder().id("jas-1").nBranches(2).build();
			const jae = new JunctionAndEndBuilder().id("jae-1").nBranches(1).build();
			const step1 = new StepBuilder().id("step-1").number(1).position(0, 0).build();
			const step2 = new StepBuilder().id("step-2").number(2).position(0, 0).build();
			const [jasBranch1, jasBranch2] = jas.data.branchesOrder;
			const [jaeBranch1] = jae.data.branchesOrder;
			const connections = [
				new ConnectionBuilder().id("c0").source("transition", "t0", "source:successor").target("junction-and-start", "jas-1", "pivot").build(),
				new ConnectionBuilder().id("c1").source("junction-and-start", "jas-1", jasBranch1).target("step", "step-1", "target:predecessor").build(),
				new ConnectionBuilder().id("c2").source("junction-and-start", "jas-1", jasBranch2).target("step", "step-2", "target:predecessor").build(),
				// Both steps lead to jae-1 whose branch count (1) doesn't match JAS (2)
				new ConnectionBuilder().id("c3").source("step", "step-1", "source:successor").target("junction-and-end", "jae-1", jaeBranch1).build(),
				new ConnectionBuilder().id("c4").source("step", "step-2", "source:successor").target("junction-and-end", "jae-1", jaeBranch1).build(),
			];
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addSteps(step1, step2)
				.addJunctionAndStart(jas)
				.addJunctionAndEnd(jae)
				.addConnections(...connections)
				.build();

			const issues = analyser.analyseInContext(jas, grafcet, []);

			const mismatchIssue = issues.find((i) => i.message.includes("nombre de branches"));
			expect(mismatchIssue).toBeDefined();
			expect(mismatchIssue?.severity).toBe("error");
		});
	});
});
