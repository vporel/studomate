import EnvVariable from "@/simulator/interpreter/environment/env-variable";
import { Environment } from "@/simulator/interpreter/environment/environment";
import { Dialect } from "@/expression-language/dialect.enum";
import { Lexer } from "@/expression-language/lexer/lexer";
import Parser from "@/expression-language/parser/parser";
import EvaluatorVisitor from "./evaluator.visitor";
import {
	getNumericRange,
	VARIABLE_TYPE_TO_NATIVE_TYPE,
	VariableType,
} from "@/schemas/variable/variable.schema";
import BlocksBuilder from "@/expression-language/ast/builders/blocks.builder";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/expression-language/ast/builders/literals.builder";
import { DivisionByZeroException } from "@/expression-language/interpreter/exceptions/division-by-zero.exception";
import EvaluatorException from "@/expression-language/interpreter/exceptions/evaluator.exception";

describe("EvaluatorVisitor", () => {
	let env: Environment;
	let evaluator: EvaluatorVisitor;
	let lexer: Lexer;

	beforeEach(() => {
		const varX = new EnvVariable("id1", "x", "number", "IN");
		varX.setValue(10);
		const varY = new EnvVariable("id2", "y", "number", "IN");
		varY.setValue(5);
		const varFlag = new EnvVariable("id3", "flag", "boolean", "IN");
		varFlag.setValue(true);
		const varResult = new EnvVariable("id4", "result", "number", "OUT");

		env = new Environment([varX, varY, varFlag, varResult]);
		evaluator = new EvaluatorVisitor(env, { timers: { deltaTimeMs: 10 } });
		lexer = new Lexer(Dialect.FR);
	});

	const parseAndEvaluate = (expression: string) => {
		const tokens = lexer.tokenize(expression);
		const parser = new Parser(tokens);
		const ast = parser.parse();
		return evaluator.visit(ast);
	};

	describe("literals", () => {
		it("evaluates number literals", () => {
			expect(parseAndEvaluate("42")).toBe(42);
			expect(parseAndEvaluate("3.14")).toBeCloseTo(3.14);
		});

		it("evaluates boolean literals", () => {
			expect(parseAndEvaluate("VRAI")).toBe(true);
			expect(parseAndEvaluate("FAUX")).toBe(false);
		});

		it("evaluates string literals", () => {
			expect(parseAndEvaluate('"hello"')).toBe("hello");
		});
	});

	describe("identifiers", () => {
		it("resolves variable values", () => {
			expect(parseAndEvaluate("x")).toBe(10);
			expect(parseAndEvaluate("y")).toBe(5);
			expect(parseAndEvaluate("flag")).toBe(true);
		});
	});

	describe("arithmetic operations", () => {
		it("evaluates addition", () => {
			expect(parseAndEvaluate("x + y")).toBe(15);
		});

		it("evaluates subtraction", () => {
			expect(parseAndEvaluate("x - y")).toBe(5);
		});

		it("evaluates multiplication", () => {
			expect(parseAndEvaluate("x * y")).toBe(50);
		});

		it("evaluates division", () => {
			expect(parseAndEvaluate("x / y")).toBe(2);
		});

		it("throws on division by zero", () => {
			expect(() => parseAndEvaluate("x / 0")).toThrow(DivisionByZeroException);
		});

		it("evaluates unary minus", () => {
			expect(parseAndEvaluate("-5")).toBe(-5);
			expect(parseAndEvaluate("x * -1")).toBe(-10);
			expect(parseAndEvaluate("x - -y")).toBe(15);
		});
	});

	describe("comparison operations", () => {
		it("evaluates equality", () => {
			expect(parseAndEvaluate("x = 10")).toBe(true);
			expect(parseAndEvaluate("x = 5")).toBe(false);
		});

		it("evaluates inequality", () => {
			expect(parseAndEvaluate("x != 5")).toBe(true);
			expect(parseAndEvaluate("x != 10")).toBe(false);
		});

		it("evaluates less than", () => {
			expect(parseAndEvaluate("y < x")).toBe(true);
			expect(parseAndEvaluate("x < y")).toBe(false);
		});

		it("evaluates greater than or equal", () => {
			expect(parseAndEvaluate("x >= 10")).toBe(true);
			expect(parseAndEvaluate("x >= 11")).toBe(false);
		});
	});

	describe("logical operations", () => {
		it("evaluates AND", () => {
			expect(parseAndEvaluate("VRAI ET VRAI")).toBe(true);
			expect(parseAndEvaluate("VRAI ET FAUX")).toBe(false);
		});

		it("evaluates OR", () => {
			expect(parseAndEvaluate("VRAI OU FAUX")).toBe(true);
			expect(parseAndEvaluate("FAUX OU FAUX")).toBe(false);
		});

		it("evaluates NOT", () => {
			expect(parseAndEvaluate("NON VRAI")).toBe(false);
			expect(parseAndEvaluate("NON FAUX")).toBe(true);
			expect(parseAndEvaluate("NON flag")).toBe(false);
		});

		it("court-circuite ET : l'opérande droit n'est pas évalué si le gauche est faux", () => {
			// La branche droite lèverait DivisionByZeroException si elle était évaluée
			expect(parseAndEvaluate("(y = 0) ET ((x / y) > 1)")).toBe(false);
		});

		it("court-circuite OU : l'opérande droit n'est pas évalué si le gauche est vrai", () => {
			expect(parseAndEvaluate("(y > 0) OU ((x / 0) > 1)")).toBe(true);
		});

		it("évalue l'opérande droit quand le gauche ne suffit pas à trancher", () => {
			expect(() => parseAndEvaluate("(y != 0) ET ((x / 0) > 1)")).toThrow(
				DivisionByZeroException,
			);
		});

		it("garde un résultat booléen sur une chaîne ET/OU", () => {
			expect(parseAndEvaluate("flag ET flag ET VRAI")).toBe(true);
			expect(parseAndEvaluate("FAUX OU flag OU FAUX")).toBe(true);
		});
	});

	describe("assignment", () => {
		it("assigns values to variables", () => {
			parseAndEvaluate("result := 42");
			expect(env.getVariableValueByName("result")).toBe(42);
		});

		it("assigns expression results", () => {
			parseAndEvaluate("result := x + y");
			expect(env.getVariableValueByName("result")).toBe(15);
		});

		it("returns assigned value", () => {
			const value = parseAndEvaluate("result := 100");
			expect(value).toBe(100);
		});

		it("throws on non-identifier left side", () => {
			const tokens = lexer.tokenize("5 := x");
			const parser = new Parser(tokens);
			const ast = parser.parse();
			expect(() => evaluator.visit(ast)).toThrow(EvaluatorException);
		});
	});

	describe("complex expressions", () => {
		it("evaluates nested arithmetic", () => {
			expect(parseAndEvaluate("(x + y) * 2")).toBe(30);
		});

		it("evaluates complex logical expressions", () => {
			expect(parseAndEvaluate("(x > 5) ET (y < 10)")).toBe(true);
		});

		it("evaluates combined operations", () => {
			expect(parseAndEvaluate("(x = 10) OU (y = 3)")).toBe(true);
		});

		it("evaluates really complex expression with deep nesting", () => {
			// Really complex expression combining multiple features:
			// - Arithmetic: x + y * 2, y - 3, x / 2, x * y + 10 - 3
			// - Comparisons: >, <, =, !=, >=, <=
			// - Logic: AND, OR, NOT with multiple levels
			// - Multiple parentheses
			// Values: x=10, y=5, flag=true
			// ((10 + 5*2) > 15) = ((10 + 10) > 15) = (20 > 15) = true
			// ((5 - 3) >= 0) = (2 >= 0) = true
			// (10 / 2 = 5) = (5 = 5) = true
			// true ET true ET true = true
			const complexExpression =
				"((x + y * 2) > 15) ET ((y - 3) >= 0) ET (x / 2 = 5)";
			expect(parseAndEvaluate(complexExpression)).toBe(true);
			// Even more complex expression with multiple comparisons
			// (10 * 5) = 50
			// (50 >= 50) = true
			// (50 != 60) = true
			// (5 <= 10) = true
			// true ET true ET true = true
			const megaComplexExpression =
				"((x * y) >= 50) ET ((x * y) != 60) ET (y <= x)";
			expect(parseAndEvaluate(megaComplexExpression)).toBe(true);

			// Ultimate expression with everything nested
			// (10 >= 5) = true, (5 <= 10) = true
			// true ET true = true
			// (10 + 5) * 2 = 30, 10 / 2 = 5, 30 - 5 = 25
			// (25 > 20) = true
			// true ET true = true
			const ultimateExpression =
				"(x >= 5 ET y <= 10) ET (((x + y) * 2 - x / 2) > 20)";
			expect(parseAndEvaluate(ultimateExpression)).toBe(true);
		});
	});

	describe("réutilisation de l'instance", () => {
		it("setEnvironment rebranche la lecture des identifiants sur le nouvel environnement", () => {
			const other = new EnvVariable("id1", "x", "number", "IN");
			other.setValue(999);
			evaluator.setEnvironment(new Environment([other]));

			expect(parseAndEvaluate("x")).toBe(999);
		});

		it("setDeltaTimeMs change le pas de temps vu par une temporisation", () => {
			const input = new EnvVariable("in", "in", "boolean", "IN");
			input.setValue(true);
			const timerEnv = new Environment([
				input,
				new EnvVariable("li", "li", "boolean", "INOUT"),
				new EnvVariable("et", "et", "number", "INOUT"),
				new EnvVariable("out", "out", "boolean", "OUT"),
			]);
			timerEnv.setVariableValueById("li", true); // pas de front, la tempo accumule
			evaluator.setEnvironment(timerEnv);
			evaluator.setDeltaTimeMs(250);

			const timer = BlocksBuilder.buildTimerNode(
				"TON",
				IdentifiersBuilder.buildIdentifierNode("in"),
				IdentifiersBuilder.buildIdentifierNode("li"),
				LiteralsBuilder.buildNumberNode(1000),
				IdentifiersBuilder.buildIdentifierNode("et"),
				IdentifiersBuilder.buildIdentifierNode("out"),
			);
			evaluator.visit(timer);

			expect(timerEnv.getVariableValueById("et")).toBe(250);
		});
	});
});

describe("EvaluatorVisitor : calcul dans le type IEC 61131-3", () => {
	const typed = (name: string, type: VariableType, value = 0) => {
		const variable = new EnvVariable(
			name,
			name,
			VARIABLE_TYPE_TO_NATIVE_TYPE[type],
			"INOUT",
			getNumericRange(type),
			type,
		);
		variable.setValue(value);
		return variable;
	};
	let env: Environment;
	let evaluator: EvaluatorVisitor;

	beforeEach(() => {
		env = new Environment([
			typed("brut", "INT", 27648),
			typed("i", "INT", -32768),
			typed("d", "DINT", 40000),
			typed("n", "DINT"),
			typed("r", "REAL", 2.5),
			typed("w", "WORD", 65535),
			typed("t", "TIME", 1000),
			new EnvVariable("u", "u", "number", "INOUT"),
		]);
		evaluator = new EvaluatorVisitor(env, { timers: { deltaTimeMs: 10 } });
	});
	const evaluate = (expression: string) =>
		evaluator.visit(new Parser(new Lexer(Dialect.FR).tokenize(expression)).parse());

	it("un produit INT déborde dans son type avant d'être affecté à un DINT", () => {
		evaluate("n := brut * 100");
		expect(env.getVariableValueByName("n")).toBe(12288);
	});

	it("un produit calculé en DINT ne déborde pas", () => {
		evaluate("n := INT_TO_DINT(brut) * 100");
		expect(env.getVariableValueByName("n")).toBe(2764800);
	});

	it("la division entière tronque vers zéro à chaque opération", () => {
		expect(evaluate("brut / 27648 * 100")).toBe(100);
		expect(evaluate("(brut - 1) / 27648 * 100")).toBe(0);
		expect(evaluate("-7 / 2")).toBe(-3);
	});

	it("la division d'un réel reste réelle", () => {
		expect(evaluate("r / 2")).toBe(1.25);
	});

	it("la négation reboucle dans le type", () => {
		expect(evaluate("-i")).toBe(-32768);
	});

	it("une durée divisée par un nombre n'est pas tronquée", () => {
		expect(evaluate("t / 3")).toBeCloseTo(333.333, 2);
	});

	it("une variable sans type déclaré garde un calcul non typé", () => {
		env.setVariableValueByName("u", 7);
		expect(evaluate("u / 2")).toBe(3.5);
	});

	describe("fonctions de conversion", () => {
		it("un entier vers un entier plus petit reboucle, comme sur un automate", () => {
			expect(evaluate("DINT_TO_INT(d)")).toBe(-25536);
		});

		it("entier et chaîne de bits : même motif binaire", () => {
			expect(evaluate("WORD_TO_INT(w)")).toBe(-1);
			expect(evaluate("INT_TO_WORD(-1)")).toBe(65535);
		});

		it("un réel vers un entier arrondit au plus proche, à égalité vers le pair", () => {
			expect(evaluate("REAL_TO_INT(1.4)")).toBe(1);
			expect(evaluate("REAL_TO_INT(1.6)")).toBe(2);
			expect(evaluate("REAL_TO_INT(r)")).toBe(2);
			expect(evaluate("REAL_TO_INT(3.5)")).toBe(4);
			expect(evaluate("REAL_TO_INT(-2.5)")).toBe(-2);
			expect(evaluate("REAL_TO_INT(-1.5)")).toBe(-2);
		});

		it("vers un réel, la valeur est conservée", () => {
			expect(evaluate("DINT_TO_REAL(d)")).toBe(40000);
		});
	});
});
