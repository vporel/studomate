import ConnectionBuilder from "../builders/connection.builder";
import GrafcetBuilder from "../builders/grafcet.builder";
import JunctionOrEndBuilder from "../builders/junction-or-end.builder";
import StepBuilder from "../builders/step.builder";
import TransitionBuilder from "../builders/transition.builder";
import JunctionOrEndHelper from "./junction-or-end.helper";

describe("JunctionOrEndHelper.getPredecessorTransitions", () => {
	const junction = new JunctionOrEndBuilder().id("j").nBranches(2).build();
	const [b1, b2] = junction.data.branchesOrder;
	const t1 = new TransitionBuilder().id("t1").build();
	const t2 = new TransitionBuilder().id("t2").build();

	const fromBranch = (
		id: string,
		branch: string,
		type: "transition" | "step",
		source: string,
	) =>
		new ConnectionBuilder()
			.id(id)
			.source(type, source, "source:successor")
			.target("junction-or-end", "j", branch)
			.build();

	it("returns an empty list when nothing leads to the junction", () => {
		const grafcet = new GrafcetBuilder().addJunctionOrEnd(junction).build();
		expect(JunctionOrEndHelper.getPredecessorTransitions("j", grafcet)).toEqual(
			[],
		);
	});

	it("returns every transition leading to the junction", () => {
		const grafcet = new GrafcetBuilder()
			.addJunctionOrEnd(junction)
			.addTransitions(t1, t2)
			.addConnections(
				fromBranch("c1", b1, "transition", "t1"),
				fromBranch("c2", b2, "transition", "t2"),
			)
			.build();

		expect(JunctionOrEndHelper.getPredecessorTransitions("j", grafcet)).toEqual(
			[t1, t2],
		);
	});

	it("skips a connection from a transition that does not exist", () => {
		const grafcet = new GrafcetBuilder()
			.addJunctionOrEnd(junction)
			.addTransition(t1)
			.addConnections(
				fromBranch("c1", b1, "transition", "ghost"),
				fromBranch("c2", b2, "transition", "t1"),
			)
			.build();

		expect(JunctionOrEndHelper.getPredecessorTransitions("j", grafcet)).toEqual(
			[t1],
		);
	});

	it("throws when a predecessor is not a transition", () => {
		const grafcet = new GrafcetBuilder()
			.addJunctionOrEnd(junction)
			.addStep(new StepBuilder().id("s1").number(1).build())
			.addConnection(fromBranch("c1", b1, "step", "s1"))
			.build();

		expect(() =>
			JunctionOrEndHelper.getPredecessorTransitions("j", grafcet),
		).toThrow("should only have transitions as predecessors");
	});
});
