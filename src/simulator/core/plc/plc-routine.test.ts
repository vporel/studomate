import { Dialect } from "@/expression-language/dialect.enum";
import { Lexer } from "../../compiler/lexer/lexer";
import Parser from "../../compiler/parser/parser";
import PLC from "./plc";
import PLCRoutine from "./plc-routine";
import PLCVariable from "./plc-variable";

describe("PLCRoutine", () => {
	let plc: PLC;
	let inputVar: PLCVariable;
	let outputVar: PLCVariable;

	beforeEach(() => {
		jest.useFakeTimers();
		inputVar = new PLCVariable("id1", "x", "input", "number");
		inputVar.setValue(10);
		outputVar = new PLCVariable("id2", "result", "output", "number");
		outputVar.setValue(0);
		plc = new PLC({
			scanTimeMs: 100,
			program: [],
			variables: [inputVar, outputVar],
		});
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe("construction", () => {
		it("creates routine with nodes", () => {
			const lexer = new Lexer(Dialect.FR);
			const tokens = lexer.tokenize("result := x + 5");
			const parser = new Parser(tokens);
			const ast = parser.parse();
			const routine = new PLCRoutine([ast]);
			expect(routine.getNodes()).toHaveLength(1);
		});
	});

	describe("execution", () => {
		it("executes simple assignment", () => {
			const lexer = new Lexer(Dialect.FR);
			const tokens = lexer.tokenize("result := 42");
			const parser = new Parser(tokens);
			const ast = parser.parse();
			const routine = new PLCRoutine([ast]);

			plc = new PLC({
				scanTimeMs: 100,
				program: [routine],
				variables: [inputVar, outputVar],
			});

			plc.start();
			jest.advanceTimersByTime(100);
			plc.stop();

			const snapshot = plc.getVariablesSnapshot();
			const resultVar = snapshot.find((v) => v.getName() === "result");
			expect(resultVar?.getValue()).toBe(42);
		});

		it("executes arithmetic expression", () => {
			const lexer = new Lexer(Dialect.FR);
			const tokens = lexer.tokenize("result := x + 5");
			const parser = new Parser(tokens);
			const ast = parser.parse();
			const routine = new PLCRoutine([ast]);

			plc = new PLC({
				scanTimeMs: 100,
				program: [routine],
				variables: [inputVar, outputVar],
			});

			plc.setPhysicalInputValueByName("x", 10);
			plc.start();
			jest.advanceTimersByTime(100);
			plc.stop();

			const snapshot = plc.getVariablesSnapshot();
			const resultVar = snapshot.find((v) => v.getName() === "result");
			expect(resultVar?.getValue()).toBe(15);
		});

		it("executes multiple statements", () => {
			const lexer = new Lexer(Dialect.FR);
			const memoryVar = new PLCVariable("id3", "temp", "memory", "number");

			const tokens1 = lexer.tokenize("temp := x + 5");
			const parser1 = new Parser(tokens1);
			const ast1 = parser1.parse();

			const tokens2 = lexer.tokenize("result := temp * 2");
			const parser2 = new Parser(tokens2);
			const ast2 = parser2.parse();

			const routine = new PLCRoutine([ast1, ast2]);

			plc = new PLC({
				scanTimeMs: 100,
				program: [routine],
				variables: [inputVar, outputVar, memoryVar],
			});

			plc.setPhysicalInputValueByName("x", 10);
			plc.start();
			jest.advanceTimersByTime(100);
			plc.stop();

			const snapshot = plc.getVariablesSnapshot();
			const resultVar = snapshot.find((v) => v.getName() === "result");
			expect(resultVar?.getValue()).toBe(30); // (10 + 5) * 2
		});
	});

	describe("getNodes", () => {
		it("returns readonly nodes array", () => {
			const lexer = new Lexer(Dialect.FR);
			const tokens = lexer.tokenize("result := 42");
			const parser = new Parser(tokens);
			const ast = parser.parse();
			const routine = new PLCRoutine([ast]);

			const nodes = routine.getNodes();
			expect(nodes).toHaveLength(1);
			expect(nodes[0]).toBe(ast);
		});
	});
});
