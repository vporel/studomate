import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/expression-language/ast/builders/literals.builder";
import { PreCompiledGrafcet } from "@/project-pre-compiler/pre-compilers/grafcet/grafcet.pre-compiler";
import { PreCompiledProject } from "@/project-pre-compiler/project.pre-compiler";
import PLCVariable from "@/simulator/core/plc/plc-variable";
import GrafcetsCompiler from "./grafcets.compiler";

function simpleGrafcet(
	transitionObservations: PreCompiledGrafcet["transitionObservations"] = new Map(),
): PreCompiledGrafcet {
	const memo0 = new PLCVariable("memo-0", "_memo_0", "memory", "boolean");
	const memo1 = new PLCVariable("memo-1", "_memo_1", "memory", "boolean");
	return {
		type: "grafcet",
		transitionObservations,
		steps: new Map([
			["step-0", { node: IdentifiersBuilder.buildIdentifierNode("X0"), initial: true }],
			["step-1", { node: IdentifiersBuilder.buildIdentifierNode("X1"), initial: false }],
		]),
		stepsMemos: new Map([
			["step-0", { variable: memo0, node: IdentifiersBuilder.buildIdentifierNode("_memo_0") }],
			["step-1", { variable: memo1, node: IdentifiersBuilder.buildIdentifierNode("_memo_1") }],
		]),
		transitions: new Map([
			[
				"trans-1",
				{
					node: LiteralsBuilder.buildBooleanNode(true),
					pureNode: LiteralsBuilder.buildBooleanNode(true),
					timers: [],
					predecessorStepsIds: ["step-0"],
					successorStepsIds: ["step-1"],
					orPriorityExclusionTransitionIds: [],
				},
			],
		]),
		actions: new Map(),
	};
}

describe("GrafcetsCompiler", () => {
	it("scanne, dans l'ordre : routine du grafcet, routine des mémos, routine d'amorçage", () => {
		const project: PreCompiledProject = {
			variables: [],
			programs: { "grafcet-1": simpleGrafcet() },
		};

		const out = new GrafcetsCompiler().compile(project);

		expect(out.scanRoutines).toHaveLength(3);
		expect(out.scanRoutines[0]).toBe(out.routinesById["grafcet-1"]);
		// routine des mémos : deux affectations `_memo_i := Xi`
		expect(out.scanRoutines[1].getNodes()).toHaveLength(2);
		// routine d'amorçage : la garde d'activation de l'étape initiale
		expect(out.scanRoutines[2].getNodes()).toHaveLength(1);
	});

	it("place l'observation en trailing et remplit l'index des réceptivités", () => {
		const obsVar = new PLCVariable("obs-1", "OBS_trans1", "memory", "boolean");
		const project: PreCompiledProject = {
			variables: [],
			programs: {
				"grafcet-1": simpleGrafcet(
					new Map([
						[
							"trans-1",
							{ variable: obsVar, node: LiteralsBuilder.buildBooleanNode(true) },
						],
					]),
				),
			},
		};

		const out = new GrafcetsCompiler().compile(project);

		expect(out.trailingRoutines).toHaveLength(1);
		expect(out.trailingRoutines[0].getNodes()).toHaveLength(1);
		expect(out.observableExpressionVariableIds).toEqual({
			"trans-1": "obs-1",
		});
	});

	it("pas de routine d'observation quand aucune transition n'est observable", () => {
		const project: PreCompiledProject = {
			variables: [],
			programs: { "grafcet-1": simpleGrafcet() },
		};

		const out = new GrafcetsCompiler().compile(project);

		expect(out.trailingRoutines).toEqual([]);
		expect(out.counters).toEqual([]);
	});

	it("ignore les programmes d'une autre notation", () => {
		const project: PreCompiledProject = {
			variables: [],
			programs: { l1: { type: "ladder" } as any },
		};

		const out = new GrafcetsCompiler().compile(project);

		expect(out.routinesById).toEqual({});
		expect(out.scanRoutines).toEqual([]);
	});
});
