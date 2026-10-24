import JunctionAndEndBuilder from "@/schemas/grafcet/builders/junction-and-end.builder";
import JunctionOrEndBuilder from "@/schemas/grafcet/builders/junction-or-end.builder";
import StepReferralSourceBuilder from "@/schemas/grafcet/builders/step-referral-source.builder";
import ConnectionBuilder from "@/schemas/grafcet/builders/connection.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import { ElementType } from "@/schemas/grafcet/element.schema";
import Connection from "@/schemas/grafcet/connection.schema";
import ConnectionsValidator, {
	ConnectionsValidationIndex,
} from "./connections.validator";

function buildGrafcet() {
	const step1 = new StepBuilder()
		.id("step-1")
		.number(1)
		.initial()
		.position(0, 0)
		.build();
	const step2 = new StepBuilder()
		.id("step-2")
		.number(2)
		.position(0, 400)
		.build();
	const trans1 = new TransitionBuilder()
		.id("trans-1")
		.expression("E1")
		.position(0, 200)
		.build();
	// step-1 →[trans-1]→ step-2 déjà en place : une 2e transition entrante sur step-2 est interdite.
	const existing = [
		new ConnectionBuilder()
			.id("c1")
			.source("step", "step-1", "source:successor")
			.target("transition", "trans-1", "target:predecessor")
			.build(),
		new ConnectionBuilder()
			.id("c2")
			.source("transition", "trans-1", "source:successor")
			.target("step", "step-2", "target:predecessor")
			.build(),
	];
	return new GrafcetBuilder()
		.id("g1")
		.name("Test")
		.addSteps(step1, step2)
		.addTransition(trans1)
		.addConnections(...existing)
		.build();
}

function buildIndex(
	grafcet: ReturnType<typeof buildGrafcet>,
): ConnectionsValidationIndex {
	const elementTypeById = new Map<string, ElementType>();
	for (const element of grafcet.getAllElements())
		elementTypeById.set(element.id, element.type as ElementType);
	const connectionsByElementId = new Map<string, Connection[]>();
	for (const connection of grafcet.connections) {
		for (const endId of new Set([connection.source.id, connection.target.id])) {
			const list = connectionsByElementId.get(endId);
			if (list) list.push(connection);
			else connectionsByElementId.set(endId, [connection]);
		}
	}
	return { elementTypeById, connectionsByElementId };
}

describe("ConnectionsValidator.validateNewConnection — équivalence avec/sans index", () => {
	const grafcet = buildGrafcet();
	const index = buildIndex(grafcet);

	const cases: {
		label: string;
		connection: Parameters<
			typeof ConnectionsValidator.validateNewConnection
		>[0];
	}[] = [
		{
			label: "step → transition (valide)",
			connection: {
				sourceId: "step-2",
				targetId: "trans-1",
				sourceHandle: "source:successor",
				targetHandle: "target:predecessor",
			},
		},
		{
			label:
				"transition → step déjà pourvu d'une transition entrante (cardinalité)",
			connection: {
				sourceId: "trans-1",
				targetId: "step-2",
				sourceHandle: "source:successor",
				targetHandle: "target:predecessor",
			},
		},
		{
			label: "step → step (type invalide)",
			connection: {
				sourceId: "step-1",
				targetId: "step-2",
				sourceHandle: "source:successor",
				targetHandle: "target:predecessor",
			},
		},
	];

	it.each(cases)("$label", ({ connection }) => {
		const withoutIndex = ConnectionsValidator.validateNewConnection(
			connection,
			grafcet,
		);
		const withIndex = ConnectionsValidator.validateNewConnection(
			connection,
			grafcet,
			index,
		);
		expect(withIndex).toBe(withoutIndex);
	});
});

describe("ConnectionsValidator.validateNewConnection : renvoi d'étape", () => {
	function buildReferralGrafcet() {
		const jOrEnd = new JunctionOrEndBuilder()
			.id("jor-end")
			.nBranches(2)
			.build();
		const jAndEnd = new JunctionAndEndBuilder()
			.id("jand-end")
			.nBranches(2)
			.build();
		return new GrafcetBuilder()
			.id("g2")
			.name("Referral")
			.addSteps(
				new StepBuilder().id("step-1").number(1).initial().build(),
				new StepBuilder().id("step-2").number(2).build(),
			)
			.addTransitions(
				new TransitionBuilder().id("trans-1").expression("E1").build(),
			)
			.addJunctionOrEnd(jOrEnd)
			.addJunctionAndEnd(jAndEnd)
			.addStepReferralSource(
				new StepReferralSourceBuilder().id("ref-1").targetStepNumber(1).build(),
			)
			.build();
	}
	const grafcet = buildReferralGrafcet();
	const validate = (
		sourceId: string,
		sourceHandle: string,
		targetId: string,
		targetHandle: string,
	) =>
		ConnectionsValidator.validateNewConnection(
			{ sourceId, targetId, sourceHandle, targetHandle },
			grafcet,
		);

	it("accepts an OR convergence pivot toward a step referral", () => {
		expect(validate("jor-end", "pivot", "ref-1", "target:predecessor")).toBe(
			true,
		);
	});

	it("accepts a transition toward a step referral", () => {
		expect(
			validate("trans-1", "source:successor", "ref-1", "target:predecessor"),
		).toBe(true);
	});

	it("still accepts an OR convergence pivot toward a step", () => {
		expect(validate("jor-end", "pivot", "step-2", "target:predecessor")).toBe(
			true,
		);
	});

	it("still refuses an AND convergence pivot toward a step referral", () => {
		expect(validate("jand-end", "pivot", "ref-1", "target:predecessor")).toBe(
			false,
		);
	});

	it("refuses a step referral toward a branch of an OR convergence", () => {
		const [branch] = grafcet.junctionsOrEnds["jor-end"].data.branchesOrder;
		expect(validate("ref-1", "target:predecessor", "jor-end", branch)).toBe(
			false,
		);
	});
});
