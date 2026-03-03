import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import JunctionOrStartBuilder from "@/schemas/grafcet/builders/junction-or-start.builder";
import JunctionOrStartAnalyser from "./junction-or-start.analyser";

describe("JunctionOrStartAnalyser", () => {
	const analyser = new JunctionOrStartAnalyser();

	describe("analyseIsolated", () => {
		it("returns no issues for valid junction", () => {
			const junction = new JunctionOrStartBuilder().id("junction-1").nBranches(2).build();

			const issues = analyser.analyseIsolated(junction);

			expect(issues).toHaveLength(0);
		});

		it("handles junction with multiple branches", () => {
			const junction = new JunctionOrStartBuilder().id("junction-1").nBranches(5).build();

			const issues = analyser.analyseIsolated(junction);

			expect(issues).toHaveLength(0);
		});
	});

	describe("analyseInContext", () => {
		it("detects pivot not connected", () => {
			const junction = new JunctionOrStartBuilder().id("junction-1").nBranches(2).build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").addJunctionOrStart(junction).build();

			const issues = analyser.analyseInContext(junction, grafcet, []);

			const pivotIssue = issues.find((i) => i.message.includes("pivot"));
			expect(pivotIssue).toBeDefined();
			expect(pivotIssue?.severity).toBe("error");
		});

		it("detects branches not all connected", () => {
			const junction = new JunctionOrStartBuilder().id("junction-1").nBranches(3).build();
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

			const issues = analyser.analyseInContext(junction, grafcet, []);

			const branchIssue = issues.find((i) => i.message.includes("branches"));
			expect(branchIssue).toBeDefined();
			expect(branchIssue?.severity).toBe("error");
		});

		it("returns no issues when all connections are valid", () => {
			const junction = new JunctionOrStartBuilder().id("junction-1").nBranches(2).build();
			const branchIds = junction.data.branchesOrder;
			const c1 = new ConnectionBuilder()
				.id("c1")
				.source("transition", "trans-1", "source:successor")
				.target("junction-or-start", "junction-1", "pivot")
				.build();
			const c2 = new ConnectionBuilder()
				.id("c2")
				.source("junction-or-start", "junction-1", branchIds[0])
				.target("step", "step-1", "target:predecessor")
				.build();
			const c3 = new ConnectionBuilder()
				.id("c3")
				.source("junction-or-start", "junction-1", branchIds[1])
				.target("step", "step-2", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addJunctionOrStart(junction)
				.addConnections(c1, c2, c3)
				.build();

			const issues = analyser.analyseInContext(junction, grafcet, []);

			expect(issues).toHaveLength(0);
		});
	});
});
