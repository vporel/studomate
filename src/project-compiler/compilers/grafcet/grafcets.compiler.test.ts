import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/expression-language/ast/builders/literals.builder";
import { PreCompiledGrafcet } from "@/project-pre-compiler/pre-compilers/grafcet/grafcet.pre-compiler";
import { PreCompiledProject } from "@/project-pre-compiler/project.pre-compiler";
import PLCVariable from "@/simulator/core/plc/plc-variable";
import withFiredVariables from "@tests/utils/fired-variables";
import GrafcetsCompiler from "./grafcets.compiler";

function simpleGrafcet(
	transitionObservations: PreCompiledGrafcet["transitionObservations"] = new Map(),
	timerElapsedVariables: { name: string; variableId: string }[] = [],
): PreCompiledGrafcet {
	const memo0 = new PLCVariable("memo-0", "_memo_0", "memory", "boolean");
	const memo1 = new PLCVariable("memo-1", "_memo_1", "memory", "boolean");
	return withFiredVariables({
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
					timerElapsedVariables,
					predecessorStepsIds: ["step-0"],
					successorStepsIds: ["step-1"],
					orPriorityExclusionTransitionIds: [],
				},
			],
		]),
		actions: new Map(),
	});
}

function withLevelActions(
	grafcet: PreCompiledGrafcet,
	levels: [stepId: string, outputs: string[]][],
): PreCompiledGrafcet {
	return {
		...grafcet,
		actions: new Map(
			levels.map(([stepId, levelOutputs], i) => [
				`action-${i}`,
				{
					phases: { onActivation: [], continuous: [], onDeactivation: [] },
					levelOutputs,
					stepId,
				},
			]),
		),
	};
}

function levelRoutineAssignments(
	out: ReturnType<GrafcetsCompiler["compile"]>,
	grafcetCount = 1,
) {
	const routine = out.scanRoutines[grafcetCount];
	return routine.getInstructions().map((instruction: any) => ({
		target: instruction.node.left.value,
		value: instruction.node.right,
	}));
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
		expect(out.scanRoutines[1].getInstructions()).toHaveLength(2);
		// routine d'amorçage : la garde d'activation de l'étape initiale
		expect(out.scanRoutines[2].getInstructions()).toHaveLength(1);
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
		expect(out.trailingRoutines[0].getInstructions()).toHaveLength(1);
		expect(out.observableExpressionVariableIds).toEqual({
			"trans-1": [{ variableId: "obs-1", label: null }],
		});
	});

	it("ajoute les variables de temps écoulé des tempos, nommées, à l'index des observables", () => {
		const project: PreCompiledProject = {
			variables: [],
			programs: {
				"grafcet-1": simpleGrafcet(new Map(), [
					{ name: "T1", variableId: "elapsed-1" },
					{ name: "T2", variableId: "elapsed-2" },
				]),
			},
		};

		const out = new GrafcetsCompiler().compile(project);

		expect(out.observableExpressionVariableIds).toEqual({
			"trans-1": [
				{ variableId: "elapsed-1", label: "T1" },
				{ variableId: "elapsed-2", label: "T2" },
			],
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

	describe("level outputs", () => {
		const compile = (programs: PreCompiledProject["programs"]) =>
			new GrafcetsCompiler().compile({ variables: [], programs });

		it("adds no routine when no continuous boolean action exists", () => {
			const out = compile({ g: withLevelActions(simpleGrafcet(), []) });
			expect(out.scanRoutines).toHaveLength(3);
		});

		it("assigns a single carrying step directly, between grafcets and memos", () => {
			const out = compile({
				g: withLevelActions(simpleGrafcet(), [["step-1", ["M"]]]),
			});
			expect(out.scanRoutines).toHaveLength(4);
			const [assign] = levelRoutineAssignments(out);
			expect(assign.target).toBe("M");
			expect(assign.value).toMatchObject({ type: "IDENTIFIER", value: "X1" });
		});

		it("ORs the steps of a same grafcet carrying the same output", () => {
			const out = compile({
				g: withLevelActions(simpleGrafcet(), [
					["step-0", ["M"]],
					["step-1", ["M"]],
				]),
			});
			const assignments = levelRoutineAssignments(out);
			expect(assignments).toHaveLength(1);
			expect(assignments[0].value).toMatchObject({
				type: "LOGICAL_EXPRESSION",
				operator: "OR",
				left: { value: "X0" },
				right: { value: "X1" },
			});
		});

		it("groups an output across several grafcets and keeps first-appearance order", () => {
			const g2 = simpleGrafcet();
			const out = compile({
				g1: withLevelActions(simpleGrafcet(), [
					["step-0", ["A"]],
					["step-1", ["M"]],
				]),
				g2: withLevelActions(g2, [["step-0", ["M"]]]),
			});
			const assignments = levelRoutineAssignments(out, 2);
			expect(assignments.map((a) => a.target)).toEqual(["A", "M"]);
			expect(assignments[1].value.type).toBe("LOGICAL_EXPRESSION");
		});
	});
});
