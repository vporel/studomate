import { Dialect } from "@/expression-language/dialect.enum";
import {
	ActionExecutionMode,
	ActionType,
} from "@/schemas/grafcet/action.schema";
import ActionBuilder from "@/schemas/grafcet/builders/action.builder";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import collectGrafcetReferences from "./grafcet-references";
import { RawReference } from "./cross-reference.types";

function find(refs: RawReference[], variableName: string): RawReference[] {
	return refs.filter((ref) => ref.variableName === variableName);
}

describe("collectGrafcetReferences", () => {
	it("relève les identifiants d'une réceptivité en lecture", () => {
		const grafcet = new GrafcetBuilder()
			.id("g1")
			.addTransition(
				new TransitionBuilder().id("t1").expression("Dcy ET NON Arret").build(),
			)
			.build();
		const refs = collectGrafcetReferences(grafcet, Dialect.FR);
		expect(find(refs, "Dcy")[0]).toMatchObject({
			access: "read",
			locationKind: "grafcet-transition",
			locationId: "t1",
		});
		expect(find(refs, "Arret")[0].access).toBe("read");
	});

	it("relève une action booléenne SET en écriture", () => {
		const grafcet = new GrafcetBuilder()
			.id("g1")
			.addAction(
				new ActionBuilder()
					.id("a1")
					.type(ActionType.BOOLEAN_VARIABLE)
					.executionMode(ActionExecutionMode.SET)
					.expression("Moteur")
					.build(),
			)
			.build();
		const refs = collectGrafcetReferences(grafcet, Dialect.FR);
		expect(find(refs, "Moteur")).toEqual([
			expect.objectContaining({
				access: "write",
				locationKind: "grafcet-action-boolean",
			}),
		]);
	});

	it("sépare cible et membres droits d'une action numérique", () => {
		const grafcet = new GrafcetBuilder()
			.id("g1")
			.addAction(
				new ActionBuilder()
					.id("a1")
					.type(ActionType.NUMERIC_VARIABLE)
					.executionMode(ActionExecutionMode.CONTINUOUS)
					.expression("Compteur := Compteur + Pas")
					.build(),
			)
			.build();
		const refs = collectGrafcetReferences(grafcet, Dialect.FR);
		expect(find(refs, "Compteur").map((r) => r.access).sort()).toEqual([
			"read",
			"write",
		]);
		expect(find(refs, "Pas")[0].access).toBe("read");
	});

	it("ignore une action TEXTE", () => {
		const grafcet = new GrafcetBuilder()
			.id("g1")
			.addAction(
				new ActionBuilder().id("a1").type(ActionType.TEXT).expression("serrer").build(),
			)
			.build();
		expect(collectGrafcetReferences(grafcet, Dialect.FR)).toEqual([]);
	});

	it("écrit la variable d'étape Xn de chaque étape numérotée", () => {
		const grafcet = new GrafcetBuilder()
			.id("g1")
			.addSteps(
				new StepBuilder().id("s0").number(0).build(),
				new StepBuilder().id("s4").number(4).build(),
			)
			.build();
		const refs = collectGrafcetReferences(grafcet, Dialect.FR);
		expect(find(refs, "X0")[0]).toMatchObject({
			access: "write",
			locationKind: "grafcet-step",
			locationParams: { stepNumber: 0 },
		});
		expect(find(refs, "X4")[0].locationId).toBe("s4");
	});

	it("ne produit rien pour une réceptivité invalide", () => {
		const grafcet = new GrafcetBuilder()
			.id("g1")
			.addTransition(
				new TransitionBuilder().id("t1").expression("Dcy ET ET").build(),
			)
			.build();
		expect(collectGrafcetReferences(grafcet, Dialect.FR)).toEqual([]);
	});
});
