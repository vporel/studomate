import { analyserEnvironment } from "@tests/utils/test-helpers";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import JunctionAndStartBuilder from "@/schemas/grafcet/builders/junction-and-start.builder";
import {
	buildAndTopologyWithMismatchedBranchCount,
	buildAndTopologyWithMismatchedOppositeJunctions,
	buildAndTopologyWithNoOppositeJunction,
	buildValidAndTopology,
	buildValidNestedAndTopology,
} from "@tests/utils/and-junction-topology";
import JunctionAndStartAnalyser from "./junction-and-start.analyser";

describe("JunctionAndStartAnalyser", () => {
	const analyser = new JunctionAndStartAnalyser();

	describe("analyseIsolated", () => {
		it("returns no issues for valid junction", () => {
			const junction = new JunctionAndStartBuilder()
				.id("junction-1")
				.nBranches(2)
				.build();

			const issues = analyser.analyseIsolated(junction);

			expect(issues).toHaveLength(0);
		});

		it("handles junction with multiple branches", () => {
			const junction = new JunctionAndStartBuilder()
				.id("junction-1")
				.nBranches(5)
				.build();

			const issues = analyser.analyseIsolated(junction);

			expect(issues).toHaveLength(0);
		});
	});

	describe("analyseInContext", () => {
		it("detects pivot not connected", () => {
			const junction = new JunctionAndStartBuilder()
				.id("junction-1")
				.nBranches(2)
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addJunctionAndStart(junction)
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
			const junction = new JunctionAndStartBuilder()
				.id("junction-1")
				.nBranches(3)
				.build();
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
			const { jas, grafcet } = buildValidAndTopology();

			const issues = analyser.analyseInContext(
				jas,
				grafcet,
				analyserEnvironment(),
			);

			expect(issues).toHaveLength(0);
		});

		it("returns no issues for a parallélisme imbriqué (nested AND divergence)", () => {
			const { jasOuter, jasInner, grafcet } = buildValidNestedAndTopology();

			expect(
				analyser.analyseInContext(jasOuter, grafcet, analyserEnvironment()),
			).toHaveLength(0);
			expect(
				analyser.analyseInContext(jasInner, grafcet, analyserEnvironment()),
			).toHaveLength(0);
		});

		it("detects AND divergence with no junction-and-end reachable", () => {
			const { junction, grafcet } =
				buildAndTopologyWithNoOppositeJunction("start");

			const issues = analyser.analyseInContext(
				junction,
				grafcet,
				analyserEnvironment(),
			);

			const closureIssue = issues.find((i) =>
				i.message.includes("convergence en ET"),
			);
			expect(closureIssue).toBeDefined();
			expect(closureIssue?.severity).toBe("error");
		});

		it("detects AND divergence branches reaching different junction-and-ends", () => {
			const { junction, grafcet } =
				buildAndTopologyWithMismatchedOppositeJunctions("start");

			const issues = analyser.analyseInContext(
				junction,
				grafcet,
				analyserEnvironment(),
			);

			const closureIssue = issues.find((i) =>
				i.message.includes("convergence en ET"),
			);
			expect(closureIssue).toBeDefined();
			expect(closureIssue?.severity).toBe("error");
		});

		it("detects mismatched branch count between JAS and JAE", () => {
			const { junction, grafcet } =
				buildAndTopologyWithMismatchedBranchCount("start");

			const issues = analyser.analyseInContext(
				junction,
				grafcet,
				analyserEnvironment(),
			);

			const mismatchIssue = issues.find((i) =>
				i.message.includes("nombre de branches"),
			);
			expect(mismatchIssue).toBeDefined();
			expect(mismatchIssue?.severity).toBe("error");
		});
	});
});
