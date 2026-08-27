import { analyserEnvironment } from "@tests/utils/test-helpers";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import JunctionOrStartBuilder from "@/schemas/grafcet/builders/junction-or-start.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import JunctionOrStartAnalyser from "./junction-or-start.analyser";

describe("JunctionOrStartAnalyser", () => {
	const analyser = new JunctionOrStartAnalyser();

	describe("analyseIsolated", () => {
		it("returns no issues for valid junction", () => {
			const junction = new JunctionOrStartBuilder()
				.id("junction-1")
				.nBranches(2)
				.build();

			const issues = analyser.analyseIsolated(junction);

			expect(issues).toHaveLength(0);
		});

		it("handles junction with multiple branches", () => {
			const junction = new JunctionOrStartBuilder()
				.id("junction-1")
				.nBranches(5)
				.build();

			const issues = analyser.analyseIsolated(junction);

			expect(issues).toHaveLength(0);
		});
	});

	describe("analyseInContext", () => {
		it("detects pivot not connected", () => {
			const junction = new JunctionOrStartBuilder()
				.id("junction-1")
				.nBranches(2)
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addJunctionOrStart(junction)
				.build();

			const issues = analyser.analyseInContext(
				junction,
				grafcet,
				analyserEnvironment(),
			);

			const pivotIssue = issues.find((i) => i.message.includes("pivot"));
			expect(pivotIssue).toBeDefined();
			expect(pivotIssue?.severity).toBe("error");
		});

		it("detects branches not all connected", () => {
			const junction = new JunctionOrStartBuilder()
				.id("junction-1")
				.nBranches(3)
				.build();
			const connection = new ConnectionBuilder()
				.id("c1")
				.source("transition", "trans-1", "source:successor")
				.target("junction-or-start", "junction-1", "target:pivot")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addJunctionOrStart(junction)
				.addConnection(connection)
				.build();

			const issues = analyser.analyseInContext(
				junction,
				grafcet,
				analyserEnvironment(),
			);

			const branchIssue = issues.find((i) => i.message.includes("branches"));
			expect(branchIssue).toBeDefined();
			expect(branchIssue?.severity).toBe("error");
		});

		it("returns no issues when all connections are valid", () => {
			const junction = new JunctionOrStartBuilder()
				.id("junction-1")
				.nBranches(2)
				.build();
			const branchIds = junction.data.branchesOrder;
			const trans1 = new TransitionBuilder()
				.id("trans-2")
				.expression("Btn1")
				.build();
			const trans2 = new TransitionBuilder()
				.id("trans-3")
				.expression("NON Btn1")
				.build();
			const c1 = new ConnectionBuilder()
				.id("c1")
				.source("step", "step-0", "source:successor")
				.target("junction-or-start", "junction-1", "pivot")
				.build();
			const c2 = new ConnectionBuilder()
				.id("c2")
				.source("junction-or-start", "junction-1", branchIds[0])
				.target("transition", "trans-2", "target:predecessor")
				.build();
			const c3 = new ConnectionBuilder()
				.id("c3")
				.source("junction-or-start", "junction-1", branchIds[1])
				.target("transition", "trans-3", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addJunctionOrStart(junction)
				.addTransitions(trans1, trans2)
				.addConnections(c1, c2, c3)
				.build();

			const issues = analyser.analyseInContext(
				junction,
				grafcet,
				analyserEnvironment(),
			);

			expect(issues).toHaveLength(0);
		});

		it("detects a branch not connected to a transition", () => {
			const junction = new JunctionOrStartBuilder()
				.id("junction-1")
				.nBranches(2)
				.build();
			const branchIds = junction.data.branchesOrder;
			const trans1 = new TransitionBuilder()
				.id("trans-2")
				.expression("Btn1")
				.build();
			const c1 = new ConnectionBuilder()
				.id("c1")
				.source("step", "step-0", "source:successor")
				.target("junction-or-start", "junction-1", "pivot")
				.build();
			const c2 = new ConnectionBuilder()
				.id("c2")
				.source("junction-or-start", "junction-1", branchIds[0])
				.target("transition", "trans-2", "target:predecessor")
				.build();
			const c3 = new ConnectionBuilder()
				.id("c3")
				.source("junction-or-start", "junction-1", branchIds[1])
				.target("step", "step-1", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addJunctionOrStart(junction)
				.addTransitions(trans1)
				.addConnections(c1, c2, c3)
				.build();

			const issues = analyser.analyseInContext(
				junction,
				grafcet,
				analyserEnvironment(),
			);

			const typeIssue = issues.find(
				(i) => i.code === "JUNCTION_OR_START_BRANCH_NOT_TRANSITION",
			);
			expect(typeIssue).toBeDefined();
			expect(typeIssue?.severity).toBe("error");
		});

		it("detects fewer than two branches", () => {
			const junction = new JunctionOrStartBuilder()
				.id("junction-1")
				.nBranches(0)
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addJunctionOrStart(junction)
				.build();

			const issues = analyser.analyseInContext(
				junction,
				grafcet,
				analyserEnvironment(),
			);

			const minBranchesIssue = issues.find(
				(i) => i.code === "JUNCTION_OR_MIN_BRANCHES",
			);
			expect(minBranchesIssue).toBeDefined();
			expect(minBranchesIssue?.severity).toBe("error");
		});

		it("detects two branches with identical receptivities", () => {
			const junction = new JunctionOrStartBuilder()
				.id("junction-1")
				.nBranches(2)
				.build();
			const branchIds = junction.data.branchesOrder;
			const trans1 = new TransitionBuilder()
				.id("trans-2")
				.expression("Btn1")
				.build();
			const trans2 = new TransitionBuilder()
				.id("trans-3")
				.expression("Btn1")
				.build();
			const c1 = new ConnectionBuilder()
				.id("c1")
				.source("step", "step-0", "source:successor")
				.target("junction-or-start", "junction-1", "pivot")
				.build();
			const c2 = new ConnectionBuilder()
				.id("c2")
				.source("junction-or-start", "junction-1", branchIds[0])
				.target("transition", "trans-2", "target:predecessor")
				.build();
			const c3 = new ConnectionBuilder()
				.id("c3")
				.source("junction-or-start", "junction-1", branchIds[1])
				.target("transition", "trans-3", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addJunctionOrStart(junction)
				.addTransitions(trans1, trans2)
				.addConnections(c1, c2, c3)
				.build();

			const issues = analyser.analyseInContext(
				junction,
				grafcet,
				analyserEnvironment(),
			);

			const exclusivityIssue = issues.find(
				(i) => i.code === "JUNCTION_OR_START_BRANCHES_NOT_EXCLUSIVE",
			);
			expect(exclusivityIssue).toBeDefined();
			expect(exclusivityIssue?.severity).toBe("error");
		});

		it("detects a branch with a receptivity that is always true", () => {
			const junction = new JunctionOrStartBuilder()
				.id("junction-1")
				.nBranches(2)
				.build();
			const branchIds = junction.data.branchesOrder;
			const trans1 = new TransitionBuilder()
				.id("trans-2")
				.expression("VRAI")
				.build();
			const trans2 = new TransitionBuilder()
				.id("trans-3")
				.expression("Btn1")
				.build();
			const c1 = new ConnectionBuilder()
				.id("c1")
				.source("step", "step-0", "source:successor")
				.target("junction-or-start", "junction-1", "pivot")
				.build();
			const c2 = new ConnectionBuilder()
				.id("c2")
				.source("junction-or-start", "junction-1", branchIds[0])
				.target("transition", "trans-2", "target:predecessor")
				.build();
			const c3 = new ConnectionBuilder()
				.id("c3")
				.source("junction-or-start", "junction-1", branchIds[1])
				.target("transition", "trans-3", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addJunctionOrStart(junction)
				.addTransitions(trans1, trans2)
				.addConnections(c1, c2, c3)
				.build();

			const issues = analyser.analyseInContext(
				junction,
				grafcet,
				analyserEnvironment(),
			);

			const exclusivityIssue = issues.find(
				(i) => i.code === "JUNCTION_OR_START_BRANCHES_NOT_EXCLUSIVE",
			);
			expect(exclusivityIssue).toBeDefined();
			expect(exclusivityIssue?.severity).toBe("error");
		});
	});
});
