import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import JunctionOrEndBuilder from "@/schemas/grafcet/builders/junction-or-end.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import analyseJunctionStructure from "./junction-structure.analyser";

const source = {
	sourceType: "grafcet-junction-or-end" as const,
	sourceId: "junction-1",
};

describe("analyseJunctionStructure", () => {
	it("reports nothing for a junction whose pivot and branches are connected", () => {
		const junction = new JunctionOrEndBuilder()
			.id("junction-1")
			.nBranches(2)
			.build();
		const [b1, b2] = junction.data.branchesOrder;
		const grafcet = new GrafcetBuilder()
			.id("grafcet-1")
			.addJunctionOrEnd(junction)
			.addTransitions(
				new TransitionBuilder().id("t1").build(),
				new TransitionBuilder().id("t2").build(),
			)
			.addConnections(
				new ConnectionBuilder()
					.id("c1")
					.source("junction-or-end", "junction-1", "pivot")
					.target("step", "step-0", "target:predecessor")
					.build(),
				new ConnectionBuilder()
					.id("c2")
					.source("transition", "t1", "source:successor")
					.target("junction-or-end", "junction-1", b1)
					.build(),
				new ConnectionBuilder()
					.id("c3")
					.source("transition", "t2", "source:successor")
					.target("junction-or-end", "junction-1", b2)
					.build(),
			)
			.build();

		const result = analyseJunctionStructure(
			junction,
			grafcet,
			source,
			"JUNCTION_OR_MIN_BRANCHES",
		);

		expect(result).toEqual({ issues: [], allBranchesConnected: true });
	});

	it("reports the pivot, the branch count and the branches of an unconnected junction", () => {
		const junction = new JunctionOrEndBuilder()
			.id("junction-1")
			.nBranches(2)
			.build();
		const grafcet = new GrafcetBuilder()
			.id("grafcet-1")
			.addJunctionOrEnd(junction)
			.build();

		const result = analyseJunctionStructure(
			junction,
			grafcet,
			source,
			"JUNCTION_OR_MIN_BRANCHES",
		);

		expect(result.allBranchesConnected).toBe(false);
		expect(result.issues.map((i) => i.code)).toEqual([
			"JUNCTION_PIVOT_NOT_CONNECTED",
			"JUNCTION_BRANCH_NOT_CONNECTED",
		]);
		expect(result.issues.every((i) => i.severity === "error")).toBe(true);
	});

	it.each(["JUNCTION_OR_MIN_BRANCHES", "JUNCTION_AND_MIN_BRANCHES"] as const)(
		"reports %s when there are fewer than two branches",
		(code) => {
			const junction = new JunctionOrEndBuilder()
				.id("junction-1")
				.nBranches(1)
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addJunctionOrEnd(junction)
				.build();

			const result = analyseJunctionStructure(junction, grafcet, source, code);

			expect(result.issues.map((i) => i.code)).toContain(code);
		},
	);

	it("attaches the given source to every issue", () => {
		const junction = new JunctionOrEndBuilder()
			.id("junction-1")
			.nBranches(2)
			.build();
		const grafcet = new GrafcetBuilder()
			.id("grafcet-1")
			.addJunctionOrEnd(junction)
			.build();

		const result = analyseJunctionStructure(
			junction,
			grafcet,
			source,
			"JUNCTION_OR_MIN_BRANCHES",
		);

		expect(result.issues.every((i) => i.source === source)).toBe(true);
	});
});
