import { Dialect } from "@/expression-language/dialect.enum";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import JunctionOrEndBuilder from "@/schemas/grafcet/builders/junction-or-end.builder";
import JunctionOrStartBuilder from "@/schemas/grafcet/builders/junction-or-start.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import StepReferralSourceBuilder from "@/schemas/grafcet/builders/step-referral-source.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import {
	compilePipelineDetailed,
	compileToPLC,
	getVariableValue,
} from "@tests/utils/test-helpers";
import { ProjectFactory } from "@tests/utils/project-factory";
import { VariableFactory } from "@tests/utils/variable-factory";

/**
 * step0 ─ OR divergence ─ [A] → step1 ─[B]┐
 *                       └ [NON A] → step2 ─[B]┘ OR convergence → renvoi vers l'étape 0
 */
function createGrafcet() {
	const g = "g";
	const step0 = new StepBuilder().id("s0").number(0).initial().build();
	const step1 = new StepBuilder().id("s1").number(1).build();
	const step2 = new StepBuilder().id("s2").number(2).build();
	const jStart = new JunctionOrStartBuilder().id("jstart").nBranches(2).build();
	const jEnd = new JunctionOrEndBuilder().id("jend").nBranches(2).build();
	const referral = new StepReferralSourceBuilder()
		.id("ref")
		.targetStepNumber(0)
		.build();
	const t1 = new TransitionBuilder().id("t1").expression("A").build();
	const t2 = new TransitionBuilder().id("t2").expression("NON A").build();
	const t3 = new TransitionBuilder().id("t3").expression("B").build();
	const t4 = new TransitionBuilder().id("t4").expression("B").build();
	const [startB1, startB2] = jStart.data.branchesOrder;
	const [endB1, endB2] = jEnd.data.branchesOrder;
	const c = (
		id: string,
		sType: any,
		sId: string,
		sHandle: string,
		tType: any,
		tId: string,
		tHandle: string,
	) =>
		new ConnectionBuilder()
			.id(`${g}-${id}`)
			.source(sType, sId, sHandle)
			.target(tType, tId, tHandle)
			.build();
	return new GrafcetBuilder()
		.id(g)
		.name("OR convergence referral")
		.addSteps(step0, step1, step2)
		.addTransitions(t1, t2, t3, t4)
		.addJunctionOrStart(jStart)
		.addJunctionOrEnd(jEnd)
		.addStepReferralSource(referral)
		.addConnections(
			c(
				"c0",
				"step",
				"s0",
				"source:successor",
				"junction-or-start",
				"jstart",
				"pivot",
			),
			c(
				"c1",
				"junction-or-start",
				"jstart",
				startB1,
				"transition",
				"t1",
				"target:predecessor",
			),
			c(
				"c2",
				"junction-or-start",
				"jstart",
				startB2,
				"transition",
				"t2",
				"target:predecessor",
			),
			c(
				"c3",
				"transition",
				"t1",
				"source:successor",
				"step",
				"s1",
				"target:predecessor",
			),
			c(
				"c4",
				"transition",
				"t2",
				"source:successor",
				"step",
				"s2",
				"target:predecessor",
			),
			c(
				"c5",
				"step",
				"s1",
				"source:successor",
				"transition",
				"t3",
				"target:predecessor",
			),
			c(
				"c6",
				"step",
				"s2",
				"source:successor",
				"transition",
				"t4",
				"target:predecessor",
			),
			c(
				"c7",
				"transition",
				"t3",
				"source:successor",
				"junction-or-end",
				"jend",
				endB1,
			),
			c(
				"c8",
				"transition",
				"t4",
				"source:successor",
				"junction-or-end",
				"jend",
				endB2,
			),
			c(
				"c9",
				"junction-or-end",
				"jend",
				"pivot",
				"step-referral-source",
				"ref",
				"target:predecessor",
			),
		)
		.build();
}

describe("OR convergence toward a step referral", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		VariableFactory.reset();
		ProjectFactory.reset();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	const createProject = () =>
		ProjectFactory.create(
			[
				VariableFactory.createLogicInput("A"),
				VariableFactory.createLogicInput("B"),
			],
			[createGrafcet()],
			"OR convergence referral",
		);

	it("analyses and compiles without error", () => {
		const pipeline = compilePipelineDetailed(createProject());

		expect(pipeline.analysis.issues).toHaveLength(0);
		expect(pipeline.preCompilation.errors).toEqual([]);
		expect(pipeline.compilation.errors).toEqual([]);
		expect(pipeline.compilation.result).toBeDefined();
	});

	it.each([
		{ a: true, branchStep: "X1" },
		{ a: false, branchStep: "X2" },
	])(
		"loops back to step 0 after the branch through $branchStep (A=$a)",
		async ({ a, branchStep }) => {
			let cycleError: Error | null = null;
			const history: { x0: boolean; branch: boolean }[] = [];
			const plc = compileToPLC(createProject(), 10, Dialect.FR, {
				onCycleEnd: (p) =>
					history.push({
						x0: getVariableValue(p, "X0") === true,
						branch: getVariableValue(p, branchStep) === true,
					}),
				onCycleError: (e) => {
					cycleError = e;
				},
			});
			expect(plc).not.toBeNull();

			plc!.setPhysicalInputValueByName("A", a);
			plc!.setPhysicalInputValueByName("B", true);
			plc!.start();
			await jest.advanceTimersByTimeAsync(400);
			plc!.stop();
			if (cycleError) throw cycleError;

			const firstBranch = history.findIndex((h) => h.branch);
			expect(firstBranch).toBeGreaterThanOrEqual(0);
			expect(history.slice(firstBranch + 1).some((h) => h.x0)).toBe(true);
		},
	);
});
