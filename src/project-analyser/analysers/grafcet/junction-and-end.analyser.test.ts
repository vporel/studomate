import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import JunctionAndEndBuilder from "@/schemas/grafcet/builders/junction-and-end.builder";
import {
	buildAndTopologyWithMismatchedBranchCount,
	buildAndTopologyWithMismatchedOppositeJunctions,
	buildAndTopologyWithNoOppositeJunction,
	buildValidAndTopology,
	buildValidNestedAndTopology,
} from "@tests/utils/and-junction-topology";
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
			const { jae, grafcet } = buildValidAndTopology();

			const issues = analyser.analyseInContext(jae, grafcet, []);

			expect(issues).toHaveLength(0);
		});

		it("returns no issues for a parallélisme imbriqué (nested AND convergence)", () => {
			const { jaeOuter, jaeInner, grafcet } = buildValidNestedAndTopology();

			expect(analyser.analyseInContext(jaeOuter, grafcet, [])).toHaveLength(0);
			expect(analyser.analyseInContext(jaeInner, grafcet, [])).toHaveLength(0);
		});

		it("detects AND convergence with no junction-and-start reachable", () => {
			const { junction, grafcet } = buildAndTopologyWithNoOppositeJunction("end");

			const issues = analyser.analyseInContext(junction, grafcet, []);

			const divergenceIssue = issues.find((i) => i.message.includes("divergence en ET"));
			expect(divergenceIssue).toBeDefined();
			expect(divergenceIssue?.severity).toBe("error");
		});

		it("detects AND convergence branches coming from different junction-and-starts", () => {
			const { junction, grafcet } = buildAndTopologyWithMismatchedOppositeJunctions("end");

			const issues = analyser.analyseInContext(junction, grafcet, []);

			const divergenceIssue = issues.find((i) => i.message.includes("divergence en ET"));
			expect(divergenceIssue).toBeDefined();
			expect(divergenceIssue?.severity).toBe("error");
		});

		it("detects mismatched branch count between JAE and JAS", () => {
			const { junction, grafcet } = buildAndTopologyWithMismatchedBranchCount("end");

			const issues = analyser.analyseInContext(junction, grafcet, []);

			const mismatchIssue = issues.find((i) => i.message.includes("nombre de branches"));
			expect(mismatchIssue).toBeDefined();
			expect(mismatchIssue?.severity).toBe("error");
		});
	});
});
