import { ASTNode } from "../nodes/ast-node";
import BlocksBuilder from "../builders/blocks.builder";
import ControlsBuilder from "../builders/controls.builder";
import ExpressionsBuilder from "../builders/expressions.builder";
import IdentifiersBuilder from "../builders/identifiers.builder";
import LiteralsBuilder from "../builders/literals.builder";
import StatementsBuilder from "../builders/statements.builder";
import AbstractCollectorVisitor from "./abstract-collector.visitor";

class CollectAll extends AbstractCollectorVisitor {
	protected matches(): boolean {
		return true;
	}
}

class CollectNothing extends AbstractCollectorVisitor {
	protected matches(): boolean {
		return false;
	}
}

const id = (name: string) => IdentifiersBuilder.buildIdentifierNode(name);
const num = (n: number) => LiteralsBuilder.buildNumberNode(n);

describe("AbstractCollectorVisitor", () => {
	it("collects children before their parent, in field order", () => {
		const left = id("a");
		const right = num(1);
		const node = ExpressionsBuilder.buildArithmeticExpressionNode(
			"+",
			left,
			right,
		);

		expect(new CollectAll().visit(node)).toEqual([left, right, node]);
	});

	it("collects nothing when no node matches", () => {
		const node = ExpressionsBuilder.buildArithmeticExpressionNode(
			"+",
			id("a"),
			num(1),
		);

		expect(new CollectNothing().visit(node)).toEqual([]);
	});

	it("walks the two branches of an if", () => {
		const cond = id("c");
		const thenStmt = StatementsBuilder.buildAssignStatementNode(
			id("x"),
			num(1),
		);
		const elseStmt = StatementsBuilder.buildAssignStatementNode(
			id("y"),
			num(2),
		);
		const node = ControlsBuilder.buildIfControlNode(
			cond,
			[thenStmt],
			[elseStmt],
		);

		const result = new CollectAll().visit(node);

		expect(result).toContain(cond);
		expect(result).toContain(thenStmt);
		expect(result).toContain(elseStmt);
		expect(result[result.length - 1]).toBe(node);
	});

	it("walks a counter, including the down part of a CTUD", () => {
		const [input, lastInput, control, preset, current, output] = [
			id("cu"),
			id("lcu"),
			id("r"),
			num(5),
			id("cv"),
			id("qu"),
		];
		const down = {
			input: id("cd"),
			lastInput: id("lcd"),
			load: id("ld"),
			output: id("qd"),
		};
		const ctud = BlocksBuilder.buildCounterNode(
			"CTUD",
			input,
			lastInput,
			control,
			preset,
			current,
			output,
			down,
		);
		const ctu = BlocksBuilder.buildCounterNode(
			"CTU",
			input,
			lastInput,
			control,
			preset,
			current,
			output,
		);

		expect(new CollectAll().visit(ctud)).toEqual([
			input,
			lastInput,
			control,
			preset,
			current,
			output,
			down.input,
			down.lastInput,
			down.load,
			down.output,
			ctud,
		]);
		expect(new CollectAll().visit(ctu)).toEqual([
			input,
			lastInput,
			control,
			preset,
			current,
			output,
			ctu,
		]);
	});

	it("walks timers and conversions", () => {
		const input = id("in");
		const timer = BlocksBuilder.buildTimerStringDeclarationNode(
			"t",
			input,
			100,
		);
		const x = id("x");
		const conv = ExpressionsBuilder.buildConversionExpressionNode(
			"DINT",
			"INT",
			x,
		);

		expect(new CollectAll().visit(timer)).toEqual([input, timer]);
		expect(new CollectAll().visit(conv as ASTNode)).toEqual([x, conv]);
	});
});
