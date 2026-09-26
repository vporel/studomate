import { Dialect } from "@/expression-language/dialect.enum";
import { Lexer } from "@/expression-language/lexer/lexer";
import Parser from "@/expression-language/parser/parser";
import EnvVariable from "@/simulator/interpreter/environment/env-variable";
import { Environment } from "@/simulator/interpreter/environment/environment";
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
			const routine = PLCRoutine.fromNodes([ast]);
			expect(routine.getInstructions()).toEqual([{ kind: "node", node: ast }]);
		});
	});

	describe("execution", () => {
		it("executes simple assignment", () => {
			const lexer = new Lexer(Dialect.FR);
			const tokens = lexer.tokenize("result := 42");
			const parser = new Parser(tokens);
			const ast = parser.parse();
			const routine = PLCRoutine.fromNodes([ast]);

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
			const routine = PLCRoutine.fromNodes([ast]);

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

			const routine = PLCRoutine.fromNodes([ast1, ast2]);

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

	describe("execute", () => {
		it("evaluates its nodes against the given environment, mutating it directly", () => {
			const lexer = new Lexer(Dialect.FR);
			const tokens = lexer.tokenize("result := x + 5");
			const parser = new Parser(tokens);
			const ast = parser.parse();
			const routine = PLCRoutine.fromNodes([ast]);

			const env = new Environment([
				new EnvVariable("id1", "x", "number", "IN"),
				new EnvVariable("id2", "result", "number", "OUT"),
			]);
			env.setVariableValueById("id1", 10);

			routine.execute(env, 100);

			expect(env.getVariableValueById("id2")).toBe(15);
		});

		it("réutilise le même évaluateur d'un appel à l'autre en suivant l'environnement fourni", () => {
			const routine = PLCRoutine.fromNodes([
				new Parser(new Lexer(Dialect.FR).tokenize("result := x + 5")).parse(),
			]);
			const makeEnv = (x: number) => {
				const env = new Environment([
					new EnvVariable("id1", "x", "number", "IN"),
					new EnvVariable("id2", "result", "number", "OUT"),
				]);
				env.setVariableValueById("id1", x);
				return env;
			};

			const env1 = makeEnv(10);
			routine.execute(env1, 100);
			expect(env1.getVariableValueById("id2")).toBe(15);

			const env2 = makeEnv(1);
			routine.execute(env2, 100);
			expect(env2.getVariableValueById("id2")).toBe(6);
			expect(env1.getVariableValueById("id2")).toBe(15); // le premier env n'est plus touché
		});

		it("lets a later routine see the writes of an earlier one sharing the same environment", () => {
			const parse = (expression: string) =>
				new Parser(new Lexer(Dialect.FR).tokenize(expression)).parse();
			const routine1 = PLCRoutine.fromNodes([parse("temp := x + 5")]);
			const routine2 = PLCRoutine.fromNodes([parse("result := temp * 2")]);

			const env = new Environment([
				new EnvVariable("id1", "x", "number", "IN"),
				new EnvVariable("id2", "result", "number", "OUT"),
				new EnvVariable("id3", "temp", "number", "INOUT"),
			]);
			env.setVariableValueById("id1", 10);

			routine1.execute(env, 100);
			routine2.execute(env, 100);

			expect(env.getVariableValueById("id2")).toBe(30); // (10 + 5) * 2
		});
	});

	describe("calls", () => {
		const parse = (expression: string) =>
			new Parser(new Lexer(Dialect.FR).tokenize(expression)).parse();
		const makeEnv = () => {
			const env = new Environment([
				new EnvVariable("id1", "x", "number", "INOUT"),
				new EnvVariable("id2", "en", "boolean", "INOUT"),
			]);
			env.setVariableValueById("id1", 0);
			env.setVariableValueById("id2", true);
			return env;
		};

		it("runs a call at its position, between the surrounding instructions", () => {
			const callee = PLCRoutine.fromNodes([parse("x := x * 10")]);
			const caller = new PLCRoutine([
				{ kind: "node", node: parse("x := 1") },
				{ kind: "call", programId: "sub", condition: parse("en") },
				{ kind: "node", node: parse("x := x + 2") },
			]);
			const env = makeEnv();

			caller.execute(env, 100, { sub: callee });

			expect(env.getVariableValueById("id1")).toBe(12); // (1 * 10) + 2
		});

		it("skips a call whose condition is false", () => {
			const callee = PLCRoutine.fromNodes([parse("x := 99")]);
			const caller = new PLCRoutine([
				{ kind: "call", programId: "sub", condition: parse("en") },
			]);
			const env = makeEnv();
			env.setVariableValueById("id2", false);

			caller.execute(env, 100, { sub: callee });

			expect(env.getVariableValueById("id1")).toBe(0);
		});

		it("skips a call to an unknown routine and keeps executing", () => {
			const caller = new PLCRoutine([
				{ kind: "call", programId: "missing", condition: parse("en") },
				{ kind: "node", node: parse("x := 5") },
			]);
			const env = makeEnv();

			caller.execute(env, 100, {});

			expect(env.getVariableValueById("id1")).toBe(5);
		});
	});
});
