import { Dialect } from "@/expression-language/dialect.enum";
import { Lexer } from "@/expression-language/lexer/lexer";
import Parser from "@/expression-language/parser/parser";
import {
	getNumericRange,
	VARIABLE_TYPE_TO_NATIVE_TYPE,
	VariableType,
} from "@/schemas/variable/variable.schema";
import EnvVariable from "../environment/env-variable";
import { Environment } from "../environment/environment";
import NumericTypeAnalyserVisitor from "./numeric-type-analyser.visitor";

describe("NumericTypeAnalyserVisitor", () => {
	const typed = (name: string, type: VariableType) =>
		new EnvVariable(
			name,
			name,
			VARIABLE_TYPE_TO_NATIVE_TYPE[type],
			"INOUT",
			getNumericRange(type),
			type,
		);
	const analyser = new NumericTypeAnalyserVisitor(
		new Environment([
			typed("i", "INT"),
			typed("d", "DINT"),
			typed("t", "TIME"),
			new EnvVariable("u", "u", "number", "INOUT"),
		]),
	);
	const typeOf = (expression: string) =>
		analyser.visit(new Parser(new Lexer(Dialect.FR).tokenize(expression)).parse());

	it("type d'une variable : son type déclaré, ANY_NUM sans type déclaré", () => {
		expect(typeOf("d")).toEqual({ type: "DINT" });
		expect(typeOf("u")).toEqual({ type: "ANY_NUM" });
	});

	it("type et valeur d'une constante selon son écriture", () => {
		expect(typeOf("5")).toEqual({ type: "ANY_INT", value: 5 });
		expect(typeOf("5.0")).toEqual({ type: "ANY_REAL", value: 5 });
		expect(typeOf("T#2s")).toEqual({ type: "TIME", value: 2000 });
		expect(typeOf("-5")).toEqual({ type: "ANY_INT", value: -5 });
	});

	it("une opération entre constantes garde sa valeur, repliée selon la norme", () => {
		expect(typeOf("30000 + 30000")).toEqual({ type: "ANY_INT", value: 60000 });
		expect(typeOf("7 / 2")).toEqual({ type: "ANY_INT", value: 3 });
	});

	it("une opération sur une variable prend le type commun, sans valeur", () => {
		expect(typeOf("i * 100")).toEqual({ type: "INT" });
		expect(typeOf("i + d")).toEqual({ type: "DINT" });
		expect(typeOf("t * 2")).toEqual({ type: "TIME" });
	});

	it("une conversion a pour type sa cible", () => {
		expect(typeOf("DINT_TO_INT(d)")).toEqual({ type: "INT" });
	});
});
