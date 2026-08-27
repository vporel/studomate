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
