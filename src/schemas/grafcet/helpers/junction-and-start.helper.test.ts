import ConnectionBuilder from "../builders/connection.builder";
import GrafcetBuilder from "../builders/grafcet.builder";
import JunctionAndStartBuilder from "../builders/junction-and-start.builder";
import StepBuilder from "../builders/step.builder";
import TransitionBuilder from "../builders/transition.builder";
import JunctionAndStartHelper from "./junction-and-start.helper";

describe("JunctionAndStartHelper.getSuccessorSteps", () => {
	const junction = new JunctionAndStartBuilder().id("j").nBranches(3).build();
	const [b1, b2, b3] = junction.data.branchesOrder;
	const s1 = new StepBuilder().id("s1").number(1).build();
	const s2 = new StepBuilder().id("s2").number(2).build();

	const toBranch = (
		id: string,
		branch: string,
		type: "step" | "transition",
		target: string,
	) =>
		new ConnectionBuilder()
			.id(id)
			.source("junction-and-start", "j", branch)
			.target(type, target, "target:predecessor")
			.build();

	it("returns an empty list for an unknown junction", () => {
		expect(
			JunctionAndStartHelper.getSuccessorSteps(
				"nope",
				new GrafcetBuilder().build(),
			),
		).toEqual([]);
	});

	it("returns the steps in branch order and skips unconnected branches", () => {
		const grafcet = new GrafcetBuilder()
			.addJunctionAndStart(junction)
			.addSteps(s1, s2)
			.addConnections(
				toBranch("c3", b3, "step", "s2"),
				toBranch("c1", b1, "step", "s1"),
			)
			.build();

		expect(JunctionAndStartHelper.getSuccessorSteps("j", grafcet)).toEqual([
			s1,
			s2,
		]);
		expect(b2).toBeDefined();
	});

	it("skips a connection to a step that does not exist", () => {
		const grafcet = new GrafcetBuilder()
			.addJunctionAndStart(junction)
			.addStep(s1)
			.addConnections(
				toBranch("c1", b1, "step", "ghost"),
				toBranch("c2", b2, "step", "s1"),
			)
			.build();

		expect(JunctionAndStartHelper.getSuccessorSteps("j", grafcet)).toEqual([
			s1,
		]);
	});

	it("throws when a branch is connected to something else than a step", () => {
		const grafcet = new GrafcetBuilder()
			.addJunctionAndStart(junction)
			.addTransition(new TransitionBuilder().id("t1").build())
			.addConnection(toBranch("c1", b1, "transition", "t1"))
			.build();

		expect(() =>
			JunctionAndStartHelper.getSuccessorSteps("j", grafcet),
		).toThrow("should be connected to steps");
	});
});
