import ConnectionBuilder from "../builders/connection.builder";
import GrafcetBuilder from "../builders/grafcet.builder";
import JunctionOrStartBuilder from "../builders/junction-or-start.builder";
import StepBuilder from "../builders/step.builder";
import TransitionBuilder from "../builders/transition.builder";
import { JUNCTION_HANDLE_PIVOT } from "../junction.schema";
import JunctionOrStartHelper from "./junction-or-start.helper";

describe("JunctionOrStartHelper", () => {
	const junction = new JunctionOrStartBuilder().id("j").nBranches(2).build();
	const [branch1, branch2] = junction.data.branchesOrder;
	const t1 = new TransitionBuilder().id("t1").build();
	const t2 = new TransitionBuilder().id("t2").build();
	const step = new StepBuilder().id("s1").number(1).build();

	const toBranch = (
		id: string,
		branch: string,
		type: "transition" | "step",
		target: string,
	) =>
		new ConnectionBuilder()
			.id(id)
			.source("junction-or-start", "j", branch)
			.target(type, target, "target:predecessor")
			.build();

	describe("getSuccessorTransitionsByBranchOrder", () => {
		it("returns an empty list for an unknown junction", () => {
			const grafcet = new GrafcetBuilder().build();
			expect(
				JunctionOrStartHelper.getSuccessorTransitionsByBranchOrder(
					"nope",
					grafcet,
				),
			).toEqual([]);
		});

		it("returns the transitions in branch order, null for an unconnected branch", () => {
			const grafcet = new GrafcetBuilder()
				.addJunctionOrStart(junction)
				.addTransitions(t1, t2)
				.addConnection(toBranch("c2", branch2, "transition", "t2"))
				.build();

			expect(
				JunctionOrStartHelper.getSuccessorTransitionsByBranchOrder(
					"j",
					grafcet,
				),
			).toEqual([null, t2]);
		});

		it("follows the display order of the branches", () => {
			const grafcet = new GrafcetBuilder()
				.addJunctionOrStart(junction)
				.addTransitions(t1, t2)
				.addConnections(
					toBranch("c1", branch1, "transition", "t1"),
					toBranch("c2", branch2, "transition", "t2"),
				)
				.build();

			expect(
				JunctionOrStartHelper.getSuccessorTransitionsByBranchOrder(
					"j",
					grafcet,
				),
			).toEqual([t1, t2]);
		});

		it("returns null when the connected transition does not exist", () => {
			const grafcet = new GrafcetBuilder()
				.addJunctionOrStart(junction)
				.addConnection(toBranch("c1", branch1, "transition", "ghost"))
				.build();

			expect(
				JunctionOrStartHelper.getSuccessorTransitionsByBranchOrder(
					"j",
					grafcet,
				),
			).toEqual([null, null]);
		});

		it("throws when a branch is connected to something else than a transition", () => {
			const grafcet = new GrafcetBuilder()
				.addJunctionOrStart(junction)
				.addStep(step)
				.addConnection(toBranch("c1", branch1, "step", "s1"))
				.build();

			expect(() =>
				JunctionOrStartHelper.getSuccessorTransitionsByBranchOrder(
					"j",
					grafcet,
				),
			).toThrow("should be connected to transitions");
		});
	});

	describe("getPredecessorStep", () => {
		const fromStep = (id: string, stepId: string) =>
			new ConnectionBuilder()
				.id(id)
				.source("step", stepId, "source:successor")
				.target("junction-or-start", "j", JUNCTION_HANDLE_PIVOT)
				.build();

		it("returns null when nothing is connected to the pivot", () => {
			const grafcet = new GrafcetBuilder().addJunctionOrStart(junction).build();
			expect(JunctionOrStartHelper.getPredecessorStep("j", grafcet)).toBeNull();
		});

		it("returns the step connected to the pivot", () => {
			const grafcet = new GrafcetBuilder()
				.addJunctionOrStart(junction)
				.addStep(step)
				.addConnection(fromStep("c1", "s1"))
				.build();
			expect(JunctionOrStartHelper.getPredecessorStep("j", grafcet)).toBe(step);
		});

		it("returns null when the connected step does not exist", () => {
			const grafcet = new GrafcetBuilder()
				.addJunctionOrStart(junction)
				.addConnection(fromStep("c1", "ghost"))
				.build();
			expect(JunctionOrStartHelper.getPredecessorStep("j", grafcet)).toBeNull();
		});

		it("throws when several connections reach the pivot", () => {
			const step2 = new StepBuilder().id("s2").number(2).build();
			const grafcet = new GrafcetBuilder()
				.addJunctionOrStart(junction)
				.addSteps(step, step2)
				.addConnections(fromStep("c1", "s1"), fromStep("c2", "s2"))
				.build();
			expect(() =>
				JunctionOrStartHelper.getPredecessorStep("j", grafcet),
			).toThrow("more than one predecessor");
		});

		it("throws when the predecessor is not a step", () => {
			const grafcet = new GrafcetBuilder()
				.addJunctionOrStart(junction)
				.addTransition(t1)
				.addConnection(
					new ConnectionBuilder()
						.id("c1")
						.source("transition", "t1", "source:successor")
						.target("junction-or-start", "j", JUNCTION_HANDLE_PIVOT)
						.build(),
				)
				.build();
			expect(() =>
				JunctionOrStartHelper.getPredecessorStep("j", grafcet),
			).toThrow("should have a step as predecessor");
		});
	});
});
