import type { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import type { ConversionExpressionNode } from "@/expression-language/ast/nodes/expressions";
import {
	getNumberLiteralKind,
	type NumberNode,
} from "@/expression-language/ast/nodes/literals";
import FinderVisitor from "@/expression-language/ast/visitors/finder.visitor";
import type { Dialect } from "@/expression-language/dialect.enum";
import { parseExpressionCached } from "@/expression-language/parse-expression-cached";
import type { HardwareDeviceDescriptor } from "@/hardware/hardware-device.descriptor";
import { ActionType } from "@/schemas/grafcet/action.schema";
import type Action from "@/schemas/grafcet/action.schema";
import type Grafcet from "@/schemas/grafcet/grafcet.schema";
import type Transition from "@/schemas/grafcet/transition.schema";
import {
	BLOCK_DEFINITIONS,
	resolvePortSpecs,
} from "@/schemas/ladder/block-definition";
import {
	getCompareBlockParams,
	type BlockElement,
} from "@/schemas/ladder/block.schema";
import type Ladder from "@/schemas/ladder/ladder.schema";
import type Project from "@/schemas/project/project.schema";
import type { VariableType } from "@/schemas/variable/variable.schema";
import ProjectAnalyserIssue, {
	type ProjectAnalyserIssueSource,
} from "./project.analyser.issue";

/** Types of the literals and conversion results an expression uses. Empty for an invalid one. */
function typesUsedBy(raw: string, dialect: Dialect): Set<VariableType> {
	const types = new Set<VariableType>();
	if (!raw || raw.trim() === "") return types;
	let ast: ASTNode;
	try {
		ast = parseExpressionCached(raw, dialect).ast;
	} catch {
		return types;
	}
	for (const node of new FinderVisitor<NumberNode>("NUMBER_LITERAL").visit(
		ast,
	)) {
		if (getNumberLiteralKind(node) === "real") types.add("REAL");
	}
	if (new FinderVisitor("STRING_LITERAL").visit(ast).length > 0) {
		types.add("STRING");
	}
	for (const node of new FinderVisitor<ConversionExpressionNode>(
		"CONVERSION_EXPRESSION",
	).visit(ast)) {
		types.add(node.targetType);
		if (node.sourceType) types.add(node.sourceType);
	}
	return types;
}

function ladderBlockExpressions(block: BlockElement): string[] {
	const definition = BLOCK_DEFINITIONS[block.data.blockType];
	const raws = resolvePortSpecs(block.data)
		.filter((spec) => spec.kind === "parameter")
		.map((spec) => definition.readParam(block.data.params, spec.suffix));
	if (block.data.blockType === "compare") {
		const params = getCompareBlockParams(block);
		raws.push(params?.in1 ?? "", params?.in2 ?? "");
	}
	return raws;
}

/**
 * Reports each use of a type the hardware target cannot run: a variable declared with it, or a
 * literal or conversion producing it in an executed program.
 */
export default function analyseHardwareTypes(
	project: Project,
	device: HardwareDeviceDescriptor,
): ProjectAnalyserIssue[] {
	const supported = new Set<VariableType>(device.supportedVariableTypes);
	const issues: ProjectAnalyserIssue[] = [];
	const report = (
		source: ProjectAnalyserIssueSource,
		types: Iterable<VariableType>,
		code:
			"HARDWARE_TYPE_NOT_SUPPORTED" | "HARDWARE_VARIABLE_TYPE_NOT_SUPPORTED",
		extra: Record<string, string> = {},
	) => {
		for (const type of types) {
			if (supported.has(type)) continue;
			issues.push(
				new ProjectAnalyserIssue("error", code, source, {
					type,
					device: device.label,
					...extra,
				}),
			);
		}
	};
	const reportExpressions = (
		source: ProjectAnalyserIssueSource,
		raws: string[],
	) => {
		const types = new Set<VariableType>();
		for (const raw of raws) {
			typesUsedBy(raw, project.dialect).forEach((type) => types.add(type));
		}
		report(source, types, "HARDWARE_TYPE_NOT_SUPPORTED");
	};

	for (const variable of project.variables) {
		report(
			{ sourceType: "project", sourceId: project.id },
			[variable.type],
			"HARDWARE_VARIABLE_TYPE_NOT_SUPPORTED",
			{ variableName: variable.mnemonic },
		);
	}

	for (const grafcet of Object.values(project.grafcets) as Grafcet[]) {
		if (grafcet.excludedFromExecution) continue;
		for (const transition of Object.values(
			grafcet.transitions,
		) as Transition[]) {
			reportExpressions(
				{
					sourceType: "grafcet-transition",
					sourceId: transition.id,
					parentId: grafcet.id,
				},
				[transition.getFullExpression()],
			);
		}
		for (const action of Object.values(grafcet.actions) as Action[]) {
			if (action.data.type === ActionType.TEXT) continue;
			reportExpressions(
				{
					sourceType: "grafcet-action",
					sourceId: action.id,
					parentId: grafcet.id,
				},
				action.getExpressionLines(),
			);
		}
	}

	for (const ladder of Object.values(project.ladders) as Ladder[]) {
		if (ladder.excludedFromExecution) continue;
		for (const section of ladder.sections) {
			for (const element of section.elements) {
				if (element.type !== "block") continue;
				reportExpressions(
					{
						sourceType: "ladder-block",
						sourceId: element.id,
						parentId: ladder.id,
					},
					ladderBlockExpressions(element),
				);
			}
		}
	}

	return issues;
}
