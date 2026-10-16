import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import PLCVariable from "@/simulator/core/plc/plc-variable";
import { PreCompiledGrafcet } from "@/project-pre-compiler/pre-compilers/grafcet/grafcet.pre-compiler";

/**
 * Completes a hand-built pre-compiled grafcet with one fired variable per transition that has
 * both upstream and downstream steps, as the grafcet pre-compiler does.
 */
export default function withFiredVariables(
	grafcet: Omit<PreCompiledGrafcet, "firedVariables">,
): PreCompiledGrafcet {
	const firedVariables: PreCompiledGrafcet["firedVariables"] = new Map();
	for (const [id, t] of grafcet.transitions) {
		if (t.predecessorStepsIds.length === 0 || t.successorStepsIds.length === 0)
			continue;
		firedVariables.set(id, {
			variable: new PLCVariable(`fired-${id}`, `_fired_${id}`, "memory", "boolean"),
			node: IdentifiersBuilder.buildIdentifierNode(`_fired_${id}`),
		});
	}
	return { ...grafcet, firedVariables };
}

export function firedVariablesOf(grafcet: PreCompiledGrafcet): PLCVariable[] {
	return Array.from(grafcet.firedVariables.values(), (f) => f.variable);
}
