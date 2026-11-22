import ConnectionBuilder from "../builders/connection.builder";
import GrafcetBuilder from "../builders/grafcet.builder";
import JunctionAndEndBuilder from "../builders/junction-and-end.builder";
import StepBuilder from "../builders/step.builder";
import TransitionBuilder from "../builders/transition.builder";
import JunctionAndEndHelper from "./junction-and-end.helper";

describe("JunctionAndEndHelper.getPredecessorSteps", () => {
	const junction = new JunctionAndEndBuilder().id("j").nBranches(2).build();
	const [b1, b2] = junction.data.branchesOrder;
	const s1 = new StepBuilder().id("s1").number(1).build();
	const s2 = new StepBuilder().id("s2").number(2).build();

	const fromBranch = (
		id: string,
		branch: string,
		type: "step" | "transition",
		source: string,
	) =>
		new ConnectionBuilder()
			.id(id)
			.source(type, source, "source:successor")
			.target("junction-and-end", "j", branch)
			.build();

	it("returns an empty list when nothing leads to the junction", () => {
		const grafcet = new GrafcetBuilder().addJunctionAndEnd(junction).build();
		expect(JunctionAndEndHelper.getPredecessorSteps("j", grafcet)).toEqual([]);
	});

	it("returns every step leading to the junction", () => {
		const grafcet = new GrafcetBuilder()
			.addJunctionAndEnd(junction)
			.addSteps(s1, s2)
			.addConnections(
				fromBranch("c1", b1, "step", "s1"),
				fromBranch("c2", b2, "step", "s2"),
			)
			.build();

		expect(JunctionAndEndHelper.getPredecessorSteps("j", grafcet)).toEqual([
			s1,
			s2,
		]);
	});

	it("skips a connection from a step that does not exist", () => {
		const grafcet = new GrafcetBuilder()
			.addJunctionAndEnd(junction)
			.addStep(s1)
			.addConnections(
				fromBranch("c1", b1, "step", "ghost"),
				fromBranch("c2", b2, "step", "s1"),
			)
			.build();

		expect(JunctionAndEndHelper.getPredecessorSteps("j", grafcet)).toEqual([
			s1,
		]);
	});

	it("throws when a predecessor is not a step", () => {
		const grafcet = new GrafcetBuilder()
			.addJunctionAndEnd(junction)
			.addTransition(new TransitionBuilder().id("t1").build())
			.addConnection(fromBranch("c1", b1, "transition", "t1"))
			.build();

		expect(() =>
			JunctionAndEndHelper.getPredecessorSteps("j", grafcet),
		).toThrow("should only have steps as predecessors");
	});
});
