import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import { PreCompiledLadder } from "@/project-pre-compiler/pre-compilers/ladder/ladder.pre-compiler";
import { PreCompiledProject } from "@/project-pre-compiler/project.pre-compiler";
import LaddersCompiler from "./ladders.compiler";

function ladder(role: "main" | "standard"): PreCompiledLadder {
	return {
		type: "ladder",
		role,
		assignments: [
			{
				kind: "coil",
				coilId: `c-${role}`,
				variable: role === "main" ? "QM" : "QS",
				mode: "normal",
				condition: IdentifiersBuilder.buildIdentifierNode("A"),
			},
		],
		edgeMemoUpdates: [],
		blockCalls: [],
		timers: [{ type: "TIMER_BLOCK" } as any],
		counters: [{ type: "COUNTER_BLOCK" } as any],
	};
}

describe("LaddersCompiler", () => {
	it("indexe chaque ladder mais ne scanne directement que le Main", () => {
		const project: PreCompiledProject = {
			variables: [],
			programs: { main: ladder("main"), aux: ladder("standard") },
		};

		const out = new LaddersCompiler().compile(project);

		expect(Object.keys(out.routinesById).sort()).toEqual(["aux", "main"]);
		expect(out.scanRoutines).toEqual([out.routinesById.main]);
		expect(out.trailingRoutines).toEqual([]);
		expect(out.observableExpressionVariableIds).toEqual({});
	});

	it("collecte les tempos et compteurs de tous les ladders", () => {
		const project: PreCompiledProject = {
			variables: [],
			programs: { main: ladder("main"), aux: ladder("standard") },
		};

		const out = new LaddersCompiler().compile(project);

		expect(out.timers).toHaveLength(2);
		expect(out.counters).toHaveLength(2);
	});

	it("ignore les programmes d'une autre notation", () => {
		const project: PreCompiledProject = {
			variables: [],
			programs: { g1: { type: "grafcet" } as any, main: ladder("main") },
		};

		const out = new LaddersCompiler().compile(project);

		expect(Object.keys(out.routinesById)).toEqual(["main"]);
	});
});
