import ConnectionBuilder from "../builders/connection.builder";
import GrafcetBuilder from "../builders/grafcet.builder";
import JunctionAndStartBuilder from "../builders/junction-and-start.builder";
import JunctionHelper from "./junction.helper";

describe("JunctionHelper", () => {
	describe("areAllBranchesConnected", () => {
		it("returns true when each branch has exactly one connection", () => {
			const junction = new JunctionAndStartBuilder().id("junction-1").nBranches(2).build();
			const [branch1, branch2] = junction.data.branchesOrder;
			const c1 = new ConnectionBuilder()
				.id("c1")
				.source("junction-and-start", "junction-1", branch1)
				.target("step", "step-1", "target:predecessor")
				.build();
			const c2 = new ConnectionBuilder()
				.id("c2")
				.source("junction-and-start", "junction-1", branch2)
				.target("step", "step-2", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addJunctionAndStart(junction)
				.addConnections(c1, c2)
				.build();

			expect(JunctionHelper.areAllBranchesConnected("junction-1", grafcet)).toBe(true);
		});

		it("returns false when two connections stack on the same branch while another stays empty", () => {
			// Faux négatif historique : le total (2 connexions === 2 branches) masquait qu'une
			// branche a deux connexions pendant que l'autre n'en a aucune.
			const junction = new JunctionAndStartBuilder().id("junction-1").nBranches(2).build();
			const [branch1] = junction.data.branchesOrder;
			const c1 = new ConnectionBuilder()
				.id("c1")
				.source("junction-and-start", "junction-1", branch1)
				.target("step", "step-1", "target:predecessor")
				.build();
			const c2 = new ConnectionBuilder()
				.id("c2")
				.source("junction-and-start", "junction-1", branch1)
				.target("step", "step-2", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addJunctionAndStart(junction)
				.addConnections(c1, c2)
				.build();

			expect(JunctionHelper.areAllBranchesConnected("junction-1", grafcet)).toBe(false);
		});

		it("ignores a stale connection left on a since-removed branch handle", () => {
			const junction = new JunctionAndStartBuilder().id("junction-1").nBranches(1).build();
			const [branch1] = junction.data.branchesOrder;
			const validConnection = new ConnectionBuilder()
				.id("c1")
				.source("junction-and-start", "junction-1", branch1)
				.target("step", "step-1", "target:predecessor")
				.build();
			const staleConnection = new ConnectionBuilder()
				.id("c2")
				.source("junction-and-start", "junction-1", "removed-branch-id")
				.target("step", "step-2", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addJunctionAndStart(junction)
				.addConnections(validConnection, staleConnection)
				.build();

			expect(JunctionHelper.areAllBranchesConnected("junction-1", grafcet)).toBe(true);
		});

		it("returns false when a branch has no connection at all", () => {
			const junction = new JunctionAndStartBuilder().id("junction-1").nBranches(2).build();
			const [branch1] = junction.data.branchesOrder;
			const c1 = new ConnectionBuilder()
				.id("c1")
				.source("junction-and-start", "junction-1", branch1)
				.target("step", "step-1", "target:predecessor")
				.build();
			const grafcet = new GrafcetBuilder()
				.id("grafcet-1")
				.addJunctionAndStart(junction)
				.addConnections(c1)
				.build();

			expect(JunctionHelper.areAllBranchesConnected("junction-1", grafcet)).toBe(false);
		});

		it("returns false when the junction doesn't exist in the grafcet", () => {
			const grafcet = new GrafcetBuilder().id("grafcet-1").build();

			expect(JunctionHelper.areAllBranchesConnected("missing-junction", grafcet)).toBe(false);
		});
	});
});
