import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import JunctionOrEndBuilder from "@/schemas/grafcet/builders/junction-or-end.builder";
import JunctionOrEndAnalyser from "./junction-or-end.analyser";

describe("JunctionOrEndAnalyser", () => {
	const analyser = new JunctionOrEndAnalyser();

	describe("analyseIsolated", () => {
		it("returns no issues for valid junction", () => {
			const junction = new JunctionOrEndBuilder().id("junction-1").nBranches(2).build();

			const issues = analyser.analyseIsolated(junction);

			expect(issues).toHaveLength(0);
		});

		it("handles junction with multiple branches", () => {
			const junction = new JunctionOrEndBuilder().id("junction-1").nBranches(5).build();

			const issues = analyser.analyseIsolated(junction);

			expect(issues).toHaveLength(0);
		});
	});

	describe("analyseInContext", () => {
		it("detects pivot not connected", () => {
			const junction = new JunctionOrEndBuilder().id("junction-1").nBranches(2).build();
			const grafcet = new GrafcetBuilder().id("grafcet-1").addJunctionOrEnd(junction).build();

			const issues = analyser.analyseInContext(junction, grafcet, []);

			const pivotIssue = issues.find((i) => i.message.includes("pivot"));
			expect(pivotIssue).toBeDefined();
			expect(pivotIssue?.severity).toBe("error");
		});

		it("detects branches not all connected", () => {
			const junction = new JunctionOrEndBuilder().id("junction-1").nBranches(3).build();
			const connection = new ConnectionBuilder()
				.id("c1")
				.source("junction-or-end", "junction-1", "source:pivot")
				.target("transition", "trans-1", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addJunctionOrEnd(junction)
				.addConnection(connection)
				.build();

			const issues = analyser.analyseInContext(junction, grafcet, []);

			const branchIssue = issues.find((i) => i.message.includes("branches"));
			expect(branchIssue).toBeDefined();
			expect(branchIssue?.severity).toBe("error");
		});

		it("returns no issues when all connections are valid", () => {
			const junction = new JunctionOrEndBuilder().id("junction-1").nBranches(2).build();
			const branchIds = junction.data.branchesOrder;
			const c1 = new ConnectionBuilder()
				.id("c1")
				.source("junction-or-end", "junction-1", "pivot")
				.target("transition", "trans-1", "target:predecessor")
				.build();
			const c2 = new ConnectionBuilder()
				.id("c2")
				.source("step", "step-1", "source:successor")
				.target("junction-or-end", "junction-1", branchIds[0])
				.build();
			const c3 = new ConnectionBuilder()
				.id("c3")
				.source("step", "step-2", "source:successor")
				.target("junction-or-end", "junction-1", branchIds[1])
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addJunctionOrEnd(junction)
				.addConnections(c1, c2, c3)
				.build();

			const issues = analyser.analyseInContext(junction, grafcet, []);

			expect(issues).toHaveLength(0);
		});
	});
});
