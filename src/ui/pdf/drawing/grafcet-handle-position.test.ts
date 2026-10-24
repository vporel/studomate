import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import CommentBuilder from "@/schemas/grafcet/builders/comment.builder";
import JunctionAndEndBuilder from "@/schemas/grafcet/builders/junction-and-end.builder";
import JunctionAndStartBuilder from "@/schemas/grafcet/builders/junction-and-start.builder";
import JunctionOrEndBuilder from "@/schemas/grafcet/builders/junction-or-end.builder";
import JunctionOrStartBuilder from "@/schemas/grafcet/builders/junction-or-start.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import StepReferralSourceBuilder from "@/schemas/grafcet/builders/step-referral-source.builder";
import StepReferralTargetBuilder from "@/schemas/grafcet/builders/step-referral-target.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import { ACTION_HANDLE_TARGET_STEP } from "@/schemas/grafcet/action.schema";
import { JUNCTION_HANDLE_PIVOT } from "@/schemas/grafcet/junction.schema";
import {
	STEP_HANDLE_SOURCE_ACTION,
	STEP_HANDLE_SOURCE_SUCCESSOR,
	STEP_HANDLE_TARGET_PREDECESSOR,
} from "@/schemas/grafcet/step.schema";
import {
	TRANSITION_HANDLE_SOURCE_SUCCESSOR,
	TRANSITION_HANDLE_TARGET_PREDECESSOR,
} from "@/schemas/grafcet/transition.schema";
import grafcetHandlePosition from "./grafcet-handle-position";

describe("grafcetHandlePosition", () => {
	const step = new StepBuilder()
		.id("s")
		.number(1)
		.position(100, 200)
		.dimensions(40, 60)
		.build();

	it("étape : prédécesseur en haut, action à droite, successeur en bas", () => {
		expect(grafcetHandlePosition(step, STEP_HANDLE_TARGET_PREDECESSOR)).toEqual(
			[120, 200],
		);
		expect(grafcetHandlePosition(step, STEP_HANDLE_SOURCE_ACTION)).toEqual([
			140, 230,
		]);
		expect(grafcetHandlePosition(step, STEP_HANDLE_SOURCE_SUCCESSOR)).toEqual([
			120, 260,
		]);
	});

	it("transition : prédécesseur en haut, successeur en bas", () => {
		const transition = new TransitionBuilder()
			.id("t")
			.position(10, 20)
			.dimensions(50, 40)
			.build();

		expect(
			grafcetHandlePosition(transition, TRANSITION_HANDLE_TARGET_PREDECESSOR),
		).toEqual([35, 20]);
		expect(
			grafcetHandlePosition(transition, TRANSITION_HANDLE_SOURCE_SUCCESSOR),
		).toEqual([35, 60]);
	});

	it("action : milieu du bord gauche", () => {
		const action = new ActionBuilder()
			.id("a")
			.position(10, 20)
			.dimensions(80, 30)
			.build();

		expect(grafcetHandlePosition(action, ACTION_HANDLE_TARGET_STEP)).toEqual([
			10, 35,
		]);
	});

	it("tenant de renvoi : milieu du haut", () => {
		const source = new StepReferralSourceBuilder()
			.id("rs")
			.position(10, 20)
			.dimensions(30, 50)
			.build();

		expect(grafcetHandlePosition(source, "target:predecessor")).toEqual([
			25, 20,
		]);
	});

	it("aboutissant de renvoi : milieu du bas", () => {
		const target = new StepReferralTargetBuilder()
			.id("rt")
			.position(10, 20)
			.dimensions(30, 50)
			.build();

		expect(grafcetHandlePosition(target, "source:successor")).toEqual([25, 70]);
	});

	it("commentaire : centre", () => {
		const comment = new CommentBuilder()
			.id("c")
			.position(10, 20)
			.dimensions(100, 40)
			.build();

		expect(grafcetHandlePosition(comment, "any")).toEqual([60, 40]);
	});

	describe.each([
		["junction-and-start", JunctionAndStartBuilder],
		["junction-or-start", JunctionOrStartBuilder],
	])("%s", (_name, Builder) => {
		const junction = new Builder()
			.id("j")
			.position(300, 100)
			.dimensions(200, 30)
			.branchesPositions(10, 190)
			.pivotPosition(60)
			.build();
		const [firstBranch, lastBranch] = junction.data.branchesOrder;

		it("pivot en haut, à x + pivotPosition", () => {
			expect(grafcetHandlePosition(junction, JUNCTION_HANDLE_PIVOT)).toEqual([
				360, 100,
			]);
		});

		it("branches en bas, à x + position de la branche", () => {
			expect(grafcetHandlePosition(junction, firstBranch)).toEqual([310, 130]);
			expect(grafcetHandlePosition(junction, lastBranch)).toEqual([490, 130]);
		});

		it("branche inconnue : milieu du bas", () => {
			expect(grafcetHandlePosition(junction, "inconnue")).toEqual([400, 130]);
		});
	});

	describe.each([
		["junction-and-end", JunctionAndEndBuilder],
		["junction-or-end", JunctionOrEndBuilder],
	])("%s", (_name, Builder) => {
		const junction = new Builder()
			.id("j")
			.position(300, 100)
			.dimensions(200, 30)
			.branchesPositions(10, 190)
			.pivotPosition(60)
			.build();
		const [firstBranch, lastBranch] = junction.data.branchesOrder;

		it("pivot en bas, à x + pivotPosition", () => {
			expect(grafcetHandlePosition(junction, JUNCTION_HANDLE_PIVOT)).toEqual([
				360, 130,
			]);
		});

		it("branches en haut, à x + position de la branche", () => {
			expect(grafcetHandlePosition(junction, firstBranch)).toEqual([310, 100]);
			expect(grafcetHandlePosition(junction, lastBranch)).toEqual([490, 100]);
		});

		it("branche inconnue : milieu du haut", () => {
			expect(grafcetHandlePosition(junction, "inconnue")).toEqual([400, 100]);
		});
	});
});
